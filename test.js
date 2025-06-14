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
const periodSelect = document.getElementById("period-select");
const btnFilter = document.getElementById("btn-filter");
const filterResultsDiv = document.getElementById("filter-results");
const totalClassesCountSpan = document.getElementById("total-classes-count");
const classesByKhoiList = document.getElementById("classes-by-khoi-list");


// Định nghĩa các khung giờ. Thêm lại các 'label' nếu bạn muốn hiển thị 'Tiết X'
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
const scheduleUnsubscribeFunctions = {};

// Hàm để điền các tùy chọn khung giờ vào dropdown
function populatePeriodSelect() {
    periodSelect.innerHTML = ''; // Xóa các tùy chọn cũ
    periods.forEach(p => {
        const option = document.createElement('option');
        option.value = p.time;
        option.textContent = (p.label ? p.label + ' (' : '') + p.time + (p.label ? ')' : '');
        periodSelect.appendChild(option);
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
            role: 'viewer' // Vai trò mặc định cho người dùng mới đăng ký
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
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: 'viewer'
                });
            }
        } catch (err) {
            console.error("Lỗi khi lấy hoặc tạo vai trò người dùng:", err);
            userRole = 'viewer';
        }
        renderAllSchedules(userRole);
        populatePeriodSelect(); // Điền tùy chọn khung giờ khi người dùng đăng nhập

        // Ẩn kết quả lọc khi đăng nhập lần đầu
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
        filterResultsDiv.style.display = 'none'; // Đảm bảo ẩn khi đăng xuất
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

// Hiển thị tất cả thời khóa biểu cho các khối
function renderAllSchedules(role) {
    ['khoi6', 'khoi7', 'khoi8', 'khoi9', 'khoi10'].forEach(khoi => {
        renderSchedule(`schedule-body-${khoi}`, khoi, role);
    });
}

// Xóa nội dung của tất cả các bảng thời khóa biểu
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
            data = periods.map(() => {
                const row = {};
                for (let d = 0; d < COLS; d++) row[`day${d}`] = [];
                return row;
            });
            await docRef.set({ data });
        }

        tbody.innerHTML = "";
        const groups = [periodsMorning, periodsAfternoon, periodsEvening];
        const titles = ["Buổi Sáng", "Buổi Chiều", "Buổi Tối"];
        
        let idx = 0;
        groups.forEach((group, gIdx) => {
            tbody.innerHTML += `<tr><td colspan="${COLS + 1}" class="section-title">${titles[gIdx]}</td></tr>`;

            group.forEach(p => {
                let row = `<tr><td><strong>${p.label ? p.label : ''}</strong><br><small>${p.time}</small></td>`;
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

// Hàm mới để đếm số lớp trong một khung giờ cụ thể
async function countClassesInPeriod(targetTime) {
    let totalClasses = 0;
    const classesByKhoi = {};

    const periodIndex = periods.findIndex(p => p.time === targetTime);

    if (periodIndex === -1) {
        console.warn(`Không tìm thấy khung giờ "${targetTime}" trong danh sách periods.`);
        return { total: 0, byKhoi: {} };
    }

    const khois = ['khoi6', 'khoi7', 'khoi8', 'khoi9', 'khoi10'];

    for (const khoiId of khois) {
        classesByKhoi[khoiId] = 0;

        try {
            const docRef = db.collection("schedules").doc(khoiId);
            const doc = await docRef.get();

            if (doc.exists && doc.data().data) {
                const data = doc.data().data;
                if (data[periodIndex]) {
                    for (let d = 0; d < COLS; d++) {
                        const lessons = data[periodIndex][`day${d}`] || [];
                        classesByKhoi[khoiId] += lessons.length;
                        totalClasses += lessons.length;
                    }
                } else {
                    console.warn(`Dữ liệu cho khung giờ ${targetTime} (idx: ${periodIndex}) của ${khoiId} không tồn tại hoặc không khớp cấu trúc.`);
                }
            } else {
                console.log(`Không có dữ liệu thời khóa biểu ban đầu cho ${khoiId} hoặc document không tồn tại.`);
            }
        } catch (error) {
            console.error(`Lỗi khi đếm lớp cho ${khoiId} trong khung giờ ${targetTime}:`, error);
        }
    }

    return { total: totalClasses, byKhoi: classesByKhoi };
}

// Xử lý sự kiện khi nút lọc được nhấn
btnFilter.addEventListener("click", async () => {
    const selectedTime = periodSelect.value;
    if (selectedTime) {
        const result = await countClassesInPeriod(selectedTime);
        totalClassesCountSpan.textContent = result.total;
        classesByKhoiList.innerHTML = ''; // Xóa danh sách cũ

        for (const khoi in result.byKhoi) {
            const listItem = document.createElement('li');
            listItem.textContent = `Khối ${khoi.replace('khoi', '')}: ${result.byKhoi[khoi]} lớp`;
            classesByKhoiList.appendChild(listItem);
        }
        filterResultsDiv.style.display = 'block'; // Hiển thị khu vực kết quả
    } else {
        alert("Vui lòng chọn một khung giờ để lọc.");
    }
});