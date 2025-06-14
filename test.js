// Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDt0pyCqJfa67knnOq1ihUMcqJaeYTQbXQ",
    authDomain: "check-tkb.firebaseapp.com",
    projectId: "check-tkb",
    storageBucket: "check-tkb.appspot.com",
    messagingSenderId: "183727078698",
    appId: "1:183727078698:web:32f915adfe2de4a549b253",
    measurementId: "G-WNLXW51J95"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Các phần tử DOM
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const btnLogin = document.getElementById("btn-login");
const btnSignup = document.getElementById("btn-signup");
const btnLogout = document.getElementById("btn-logout");
const authError = document.getElementById("auth-error");
const userEmailSpan = document.getElementById("user-email");
const authSection = document.getElementById("auth-section");
const scheduleContainer = document.getElementById("schedule-container");

// DOM elements cho bộ lọc mới
const periodCheckboxesDiv = document.getElementById("period-checkboxes");
const dayCheckboxesDiv = document.getElementById("day-checkboxes");
const btnFilter = document.getElementById("btn-filter");
const filterResultsDiv = document.getElementById("filter-results");
const totalClassesCountSpan = document.getElementById("total-classes-count");
const classesByKhoiList = document.getElementById("classes-by-khoi-list");

// New DOM elements for clear/select all buttons
const btnClearPeriods = document.getElementById("btn-clear-periods");
const btnSelectAllPeriods = document.getElementById("btn-select-all-periods");
const btnClearDays = document.getElementById("btn-clear-days");
const btnSelectAllDays = document.getElementById("btn-select-all-days");


// Định nghĩa các khung giờ (đã bỏ label)
const periodsMorning = [
    { time: "8h-10h" },
    { time: "8h-11h" },
    { time: "8h-9h30" },
    { time: "08h30-11h" },
    { time: "8h30-11h30" },
    { time: "9h45-11h15" }
];
const periodsAfternoon = [
    { time: "14h - 15h30" },
    { time: "14h - 16h" },
    { time: "14h-16h30" },
    { time: "14h-17h" },
    { time: "14h30-16h" },
    { time: "15h-17h30" },
    { time: "15h30-17h" },
    { time: "16h-17h30" },
    { time: "16h-18h" },
    { time: "16h-18h30" },
    { time: "16h30-18h" },
    { time: "16h30-18h30" },
    { time: "16h30-19h" },
    { time: "17h-18h30" },
    { time: "17h-19h" },
    { time: "17h30-19h" },
    { time: "17h30-20h" },
    { time: "17h30-19h30" },
];
const periodsEvening = [
    { time: "18h-19h30" },
    { time: "18h30-20h" },
    { time: "18h30-20h30" },
    { time: "19h-21h" },
    { time: "19h30-21h" },
    { time: "19h30-21h30" },
    { time: "20h-21h30" },
    { time: "20h-22h" },
];
const periods = [...periodsMorning, ...periodsAfternoon, ...periodsEvening];
const COLS = 7; // Số cột (Thứ 2 đến CN)
const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"]; // Mảng các ngày trong tuần
const scheduleUnsubscribeFunctions = {};

// Hàm để điền các checkbox khung giờ
function populatePeriodCheckboxes(checkAll = true) {
    periodCheckboxesDiv.innerHTML = ''; // Xóa các checkbox cũ
    periods.forEach((p, index) => {
        const div = document.createElement('div');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `period-${index}`;
        input.value = p.time; // Giá trị là chuỗi thời gian
        input.checked = checkAll; // Mặc định chọn tất cả các khung giờ hoặc không chọn

        const label = document.createElement('label');
        label.htmlFor = `period-${index}`;
        label.textContent = p.time;

        div.appendChild(input);
        div.appendChild(label);
        periodCheckboxesDiv.appendChild(div);
    });
}

// Hàm để điền các checkbox ngày
function populateDayCheckboxes(checkAll = true) {
    dayCheckboxesDiv.innerHTML = ''; // Xóa các checkbox cũ
    days.forEach((day, index) => {
        const div = document.createElement('div');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `day-${index}`;
        input.value = index; // Giá trị là chỉ số ngày (0 cho T2, 1 cho T3, ...)
        input.checked = checkAll; // Mặc định chọn tất cả các ngày hoặc không chọn

        const label = document.createElement('label');
        label.htmlFor = `day-${index}`;
        label.textContent = day;

        div.appendChild(input);
        div.appendChild(label);
        dayCheckboxesDiv.appendChild(div);
    });
}

// Hàm chung để xử lý chọn/bỏ chọn tất cả checkboxes trong một container
function setAllCheckboxes(container, checked) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
}

// Xác thực
btnLogin.addEventListener("click", () => {
    auth.signInWithEmailAndPassword(loginEmail.value, loginPassword.value)
        .catch(error => {
            authError.textContent = getAuthErrorMessage(error.code);
        });
});

btnSignup.addEventListener("click", async () => {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(loginEmail.value, loginPassword.value);
        await db.collection('users').doc(userCredential.user.uid).set({
            email: userCredential.user.email,
            role: 'viewer'
        });
        alert("Đăng ký thành công!");
    } catch (error) {
        authError.textContent = getAuthErrorMessage(error.code);
        console.error("Lỗi đăng ký:", error.code, error.message);
    }
});

btnLogout.addEventListener("click", () => {
    auth.signOut();
});

// Lắng nghe trạng thái xác thực của người dùng
auth.onAuthStateChanged(async (user) => {
    if (user) {
        authSection.style.display = "none";
        scheduleContainer.style.display = "block";
        btnLogout.style.display = "block";
        userEmailSpan.textContent = user.email;
        authError.textContent = "";

        let userRole = 'viewer';
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                userRole = doc.data().role || 'viewer';
            } else {
                // Nếu người dùng không có vai trò, gán mặc định là 'viewer' và lưu vào Firestore
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: 'viewer'
                });
            }
        } catch (err) {
            console.error("Lỗi khi lấy hoặc tạo vai trò người dùng:", err);
            userRole = 'viewer'; // Đảm bảo vai trò là 'viewer' nếu có lỗi
        }
        renderAllSchedules(userRole);
        populatePeriodCheckboxes(); // Gọi hàm mới để điền các checkbox khung giờ (mặc định chọn tất cả)
        populateDayCheckboxes(); // Điền các checkbox ngày (mặc định chọn tất cả)

        filterResultsDiv.style.display = 'none';

    } else {
        clearAllSchedules();
        for (const key in scheduleUnsubscribeFunctions) {
            scheduleUnsubscribeFunctions[key]();
            delete scheduleUnsubscribeFunctions[key];
        }
        authSection.style.display = "block";
        scheduleContainer.style.display = "none";
        btnLogout.style.display = "none";
        userEmailSpan.textContent = "";
        authError.textContent = "";
        filterResultsDiv.style.display = 'none';
    }
});

function getAuthErrorMessage(code) {
    switch (code) {
        case 'auth/email-already-in-use': return 'Email đã được sử dụng bởi một tài khoản khác.';
        case 'auth/invalid-email': return 'Địa chỉ email không hợp lệ.';
        case 'auth/weak-password': return 'Mật khẩu quá yếu. Vui lòng nhập mật khẩu tối thiểu 6 ký tự.';
        case 'auth/user-not-found': return 'Không tìm thấy người dùng với email này.';
        case 'auth/wrong-password': return 'Mật khẩu không chính xác.';
        case 'auth/network-request-failed': return 'Lỗi mạng. Vui lòng kiểm tra kết nối internet của bạn.';
        default: return 'Đã xảy ra lỗi xác thực không xác định. Vui lòng thử lại.';
    }
}

function renderAllSchedules(role) {
    ['khoi6', 'khoi7', 'khoi8', 'khoi9', 'khoi10'].forEach(khoi => {
        renderSchedule(`schedule-body-${khoi}`, khoi, role);
    });
}

function clearAllSchedules() {
    ['khoi6', 'khoi7', 'khoi8', 'khoi9', 'khoi10'].forEach(khoi => {
        document.getElementById(`schedule-body-${khoi}`).innerHTML = "";
    });
}

// Render thời khóa biểu cho một khối cụ thể
function renderSchedule(bodyId, khoiId, role) {
    const tbody = document.getElementById(bodyId);
    if (scheduleUnsubscribeFunctions[khoiId]) {
        scheduleUnsubscribeFunctions[khoiId]();
    }

    const docRef = db.collection("schedules").doc(khoiId);

    scheduleUnsubscribeFunctions[khoiId] = docRef.onSnapshot(async doc => {
        let data = doc.exists && doc.data().data ? doc.data().data : [];

        if (!doc.exists) {
            // Khởi tạo cấu trúc dữ liệu nếu document không tồn tại
            data = periods.map(() => {
                const row = {};
                for (let d = 0; d < COLS; d++) row[`day${d}`] = [];
                return row;
            });
            await docRef.set({ data }); // Lưu cấu trúc rỗng vào Firestore
        }

        tbody.innerHTML = "";
        const groups = [periodsMorning, periodsAfternoon, periodsEvening];
        const titles = ["Buổi Sáng", "Buổi Chiều", "Buổi Tối"];

        let idx = 0; // Index tổng thể cho từng khung giờ trong mảng `periods`
        groups.forEach((group, gIdx) => {
            tbody.innerHTML += `<tr><td colspan="${COLS + 1}" class="section-title">${titles[gIdx]}</td></tr>`;

            group.forEach(p => {
                // Chỉ hiển thị thời gian, không có label
                let row = `<tr><td><strong>${p.time}</strong></td>`;
                for (let d = 0; d < COLS; d++) {
                    const lessons = data[idx]?.[`day${d}`] || [];
                    let content = lessons.length ?
                        lessons.map(l => `<strong>${l.subject}</strong><br><small>${l.teacher}</small>`).join('<br>') :
                        "<span style='color:#aaa'>(trống)</span>";

                    const isEditable = (role === 'admin' || role === `editor_${khoiId}`);
                    const cursorStyle = isEditable ? 'pointer' : 'default';
                    const onClickHandler = isEditable ? `editCell(${idx},${d},'${khoiId}')` : '';

                    row += `<td style="cursor:${cursorStyle}" onclick="${onClickHandler}">${content}</td>`;
                }
                row += "</tr>";
                tbody.innerHTML += row;
                idx++;
            });
        });
    }, err => {
        console.error("Lỗi khi tải thời khóa biểu:", err);
        tbody.innerHTML = "<tr><td colspan='" + (COLS + 1) + "' style='color:red'>Lỗi tải dữ liệu. Vui lòng kiểm tra kết nối hoặc quyền truy cập.</td></tr>";
    });
}

// Chức năng chỉnh sửa ô thời khóa biểu (global function)
window.editCell = async function (i, j, khoiId) {
    try {
        const doc = await db.collection("schedules").doc(khoiId).get();
        if (!doc.exists) {
            console.error(`Document for ${khoiId} does not exist.`);
            alert("Lỗi: Không tìm thấy dữ liệu thời khóa biểu cho khối này.");
            return;
        }

        let data = doc.data().data;
        if (!data || !Array.isArray(data) || data.length <= i) {
            console.error(`Data structure for ${khoiId} is invalid or index ${i} is out of bounds.`);
            alert("Lỗi: Cấu trúc dữ liệu thời khóa biểu không hợp lệ.");
            return;
        }

        const lessons = data[i][`day${j}`] || [];
        const current = lessons.map(l => `${l.subject}, ${l.teacher}`).join('; ');
        const input = prompt("Nhập môn, giáo viên (vd: Toán, Thầy A; Lý, Cô B):", current);

        if (input === null) return; // Người dùng nhấn Hủy

        const newLessons = input.split(';').map(s => {
            const [subject, teacher = ''] = s.split(',').map(p => p.trim());
            return { subject, teacher };
        }).filter(l => l.subject); // Lọc bỏ các mục không có môn học

        // Cập nhật dữ liệu và lưu vào Firestore
        data[i][`day${j}`] = newLessons;
        await db.collection("schedules").doc(khoiId).set({ data }, { merge: true });
        console.log(`Đã cập nhật ô [${i}][day${j}] của ${khoiId}`);
    } catch (error) {
        console.error("Lỗi khi chỉnh sửa ô:", error);
        alert(`Lỗi khi cập nhật thời khóa biểu: ${getAuthErrorMessage(error.code) || error.message}`);
    }
};

/**
 * Đếm số lớp học trong các khung giờ và ngày đã chọn cho tất cả các khối.
 * @param {string[]} selectedPeriods - Mảng các chuỗi thời gian của khung giờ được chọn (ví dụ: ["8h-10h", "14h - 15h30"]).
 * @param {number[]} selectedDayIndices - Mảng các chỉ số ngày được chọn (0 cho Thứ 2, 1 cho Thứ 3, ..., 6 cho Chủ Nhật).
 * @returns {Promise<{total: number, byKhoi: object}>} Tổng số lớp và số lớp theo từng khối.
 */
async function countClassesInMultiplePeriodsAndDays(selectedPeriods, selectedDayIndices) {
    let totalClasses = 0;
    const classesByKhoi = {};

    // Chuyển đổi các chuỗi thời gian thành chỉ số tương ứng trong mảng 'periods'
    const periodIndices = selectedPeriods.map(time => periods.findIndex(p => p.time === time)).filter(index => index !== -1);

    if (periodIndices.length === 0) {
        console.warn("Không có khung giờ hợp lệ nào được chọn để lọc.");
        return { total: 0, byKhoi: {} };
    }
    if (selectedDayIndices.length === 0) {
        console.warn("Không có ngày nào được chọn để lọc.");
        return { total: 0, byKhoi: {} };
    }

    const khois = ['khoi6', 'khoi7', 'khoi8', 'khoi9', 'khoi10'];

    for (const khoiId of khois) {
        classesByKhoi[khoiId] = 0; // Khởi tạo số lớp cho khối này

        try {
            const docRef = db.collection("schedules").doc(khoiId);
            const doc = await docRef.get();

            if (doc.exists && doc.data().data) {
                const data = doc.data().data;

                // Duyệt qua từng khung giờ được chọn
                for (const pIdx of periodIndices) {
                    // Kiểm tra xem dữ liệu cho khung giờ này có tồn tại và là một đối tượng không
                    if (data[pIdx] && typeof data[pIdx] === 'object') {
                        // Duyệt qua từng ngày được chọn
                        for (const dIdx of selectedDayIndices) {
                            const lessons = data[pIdx][`day${dIdx}`] || [];
                            classesByKhoi[khoiId] += lessons.length;
                            totalClasses += lessons.length;
                        }
                    } else {
                        // Cảnh báo nếu dữ liệu cho một khung giờ cụ thể bị thiếu hoặc sai định dạng
                        console.warn(`Dữ liệu cho khung giờ (index: ${pIdx}) của ${khoiId} không tồn tại hoặc không đúng định dạng.`);
                    }
                }
            } else {
                console.log(`Không có dữ liệu thời khóa biểu ban đầu cho ${khoiId} hoặc document không tồn tại.`);
            }
        } catch (error) {
            console.error(`Lỗi khi đếm lớp cho ${khoiId} với các bộ lọc đã chọn:`, error);
        }
    }

    return { total: totalClasses, byKhoi: classesByKhoi };
}


// Xử lý sự kiện khi nút lọc được nhấn
btnFilter.addEventListener("click", async () => {
    // Lấy các khung giờ được chọn từ checkbox
    const selectedPeriodInputs = Array.from(periodCheckboxesDiv.querySelectorAll('input[type="checkbox"]:checked'));
    const selectedPeriodTimes = selectedPeriodInputs.map(input => input.value);

    // Lấy các ngày được chọn từ checkbox
    const selectedDayInputs = Array.from(dayCheckboxesDiv.querySelectorAll('input[type="checkbox"]:checked'));
    const selectedDayIndices = selectedDayInputs.map(input => parseInt(input.value, 10));

    if (selectedPeriodTimes.length === 0 && selectedDayIndices.length === 0) {
        alert("Vui lòng chọn ít nhất một khung giờ hoặc một ngày để lọc.");
        filterResultsDiv.style.display = 'none';
        return;
    }
    
    // Nếu không chọn khung giờ nào, giả định tất cả khung giờ
    const periodsToFilter = selectedPeriodTimes.length > 0 ? selectedPeriodTimes : periods.map(p => p.time);
    // Nếu không chọn ngày nào, giả định tất cả các ngày
    const daysToFilter = selectedDayIndices.length > 0 ? selectedDayIndices : Array.from({length: COLS}, (_, i) => i);


    const result = await countClassesInMultiplePeriodsAndDays(periodsToFilter, daysToFilter);
    
    totalClassesCountSpan.textContent = result.total;
    classesByKhoiList.innerHTML = ''; // Xóa danh sách cũ

    if (result.total === 0) {
        const listItem = document.createElement('li');
        listItem.textContent = 'Không có lớp học nào khớp với tiêu chí lọc.';
        classesByKhoiList.appendChild(listItem);
    } else {
        for (const khoi in result.byKhoi) {
            const listItem = document.createElement('li');
            listItem.textContent = `Khối ${khoi.replace('khoi', '')}: ${result.byKhoi[khoi]} lớp`;
            classesByKhoiList.appendChild(listItem);
        }
    }
    filterResultsDiv.style.display = 'block'; // Hiển thị khu vực kết quả
});


// Event listeners cho các nút chọn/bỏ chọn tất cả
btnClearPeriods.addEventListener("click", () => {
    setAllCheckboxes(periodCheckboxesDiv, false);
});

btnSelectAllPeriods.addEventListener("click", () => {
    setAllCheckboxes(periodCheckboxesDiv, true);
});

btnClearDays.addEventListener("click", () => {
    setAllCheckboxes(dayCheckboxesDiv, false);
});

btnSelectAllDays.addEventListener("click", () => {
    setAllCheckboxes(dayCheckboxesDiv, true);
});