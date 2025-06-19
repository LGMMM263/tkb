// Cấu hình Firebase
// Các biến này không phụ thuộc vào DOM, nên có thể khai báo ở đây.
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

// Định nghĩa các khung giờ (các biến này không phụ thuộc vào DOM)
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
const periods = [...periodsMorning, ...periodsAfternoon, ...periodsEvening]; // Tổng cộng 32 khung giờ
const COLS = 7; // Số cột (Thứ 2 đến CN)
const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"]; // Mảng các ngày trong tuần
const scheduleUnsubscribeFunctions = {}; // Đối tượng lưu trữ các hàm hủy đăng ký snapshot Firestore

// Biến toàn cục để lưu trữ toàn bộ dữ liệu thời khóa biểu sau khi được tải về
// Cấu trúc: { khoiId: [ { day0: [{subject, teacher}], day1: [] }, ... ], ... }
// Đây là cấu trúc mà `editCell` mong đợi và chúng ta sẽ chuẩn hóa mọi thứ theo nó.
let allSchedulesData = {};

// Bọc toàn bộ mã JavaScript còn lại vào sự kiện DOMContentLoaded
// Điều này đảm bảo rằng tất cả các phần tử HTML đã được tải vào DOM
// trước khi JavaScript cố gắng truy cập hoặc thao tác với chúng.
document.addEventListener('DOMContentLoaded', () => {
    // Các phần tử DOM chính
    const loginEmail = document.getElementById("login-email");
    const loginPassword = document.getElementById("login-password");
    const btnLogin = document.getElementById("btn-login");
    const btnSignup = document.getElementById("btn-signup");
    const btnLogout = document.getElementById("btn-logout");
    const authError = document.getElementById("auth-error");
    const userEmailSpan = document.getElementById("user-email");
    const authSection = document.getElementById("auth-section");
    const scheduleContainer = document.getElementById("schedule-container");

    // Các phần tử DOM cho bộ lọc thời khóa biểu
    const periodCheckboxesDiv = document.getElementById("period-checkboxes");
    const dayCheckboxesDiv = document.getElementById("day-checkboxes");
    const btnFilter = document.getElementById("btn-filter");
    const filterResultsDiv = document.getElementById("filter-results");
    const totalClassesCountSpan = document.getElementById("total-classes-count");
    const classesByKhoiList = document.getElementById("classes-by-khoi-list");

    // Các nút chọn/bỏ chọn tất cả cho bộ lọc
    const btnClearPeriods = document.getElementById("btn-clear-periods");
    const btnSelectAllPeriods = document.getElementById("btn-select-all-periods");
    const btnClearDays = document.getElementById("btn-clear-days");
    const btnSelectAllDays = document.getElementById("btn-select-all-days");

    // Các phần tử DOM mới cho tìm kiếm giáo viên
    const teacherNameInput = document.getElementById('teacher-name-input');
    const btnSearchTeacher = document.getElementById('btn-search-teacher');
    const searchResultsTeacherDiv = document.getElementById('search-results-teacher');
    const teacherClassesList = document.getElementById('teacher-classes-list');
    const foundTeacherNameSpan = document.getElementById('found-teacher-name');
    const totalTeacherClassesCountSpan = document.getElementById('total-teacher-classes-count');

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

    // Xác thực - Xử lý đăng nhập
    btnLogin.addEventListener("click", () => {
        auth.signInWithEmailAndPassword(loginEmail.value, loginPassword.value)
            .catch(error => {
                authError.textContent = getAuthErrorMessage(error.code);
            });
    });

    // Xác thực - Xử lý đăng ký
    btnSignup.addEventListener("click", async () => {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(loginEmail.value, loginPassword.value);
            // Sau khi đăng ký thành công, lưu thông tin người dùng và vai trò mặc định vào Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                email: userCredential.user.email,
                role: 'viewer' // Gán vai trò mặc định là 'viewer'
            });
            alert("Đăng ký thành công!");
        } catch (error) {
            authError.textContent = getAuthErrorMessage(error.code);
            console.error("Lỗi đăng ký:", error.code, error.message);
        }
    });

    // Xử lý đăng xuất
    btnLogout.addEventListener("click", () => {
        auth.signOut();
    });

    // Lắng nghe trạng thái xác thực của người dùng
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Người dùng đã đăng nhập
            authSection.style.display = "none";
            scheduleContainer.style.display = "block";
            btnLogout.style.display = "block";
            userEmailSpan.textContent = user.email;
            authError.textContent = "";

            let userRole = 'viewer';
            try {
                // Lấy vai trò của người dùng từ Firestore
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
            renderAllSchedules(userRole); // Render tất cả thời khóa biểu
            populatePeriodCheckboxes(); // Điền các checkbox khung giờ (mặc định chọn tất cả)
            populateDayCheckboxes(); // Điền các checkbox ngày (mặc định chọn tất cả)

            filterResultsDiv.style.display = 'none'; // Ẩn kết quả lọc ban đầu
            teacherNameInput.value = ''; // Xóa nội dung tìm kiếm giáo viên khi đăng nhập
            searchResultsTeacherDiv.style.display = 'none'; // Ẩn kết quả tìm kiếm giáo viên ban đầu

        } else {
            // Người dùng đã đăng xuất
            clearAllSchedules(); // Xóa tất cả thời khóa biểu trên giao diện
            // Hủy đăng ký tất cả các listener snapshot để tránh rò rỉ bộ nhớ
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
            searchResultsTeacherDiv.style.display = 'none';
        }
    });

    // Hàm lấy thông báo lỗi xác thực dễ hiểu
    function getAuthErrorMessage(code) {
        switch (code) {
            case 'auth/email-already-in-use': return 'Email đã được sử dụng bởi một tài khoản khác.';
            case 'auth/invalid-email': return 'Địa chỉ email không hợp lệ.';
            case 'auth/operation-not-allowed': return 'Đăng nhập bằng email/mật khẩu không được bật. Vui lòng liên hệ quản trị viên.';
            case 'auth/weak-password': return 'Mật khẩu quá yếu. Mật khẩu phải có ít nhất 6 ký tự.';
            case 'auth/wrong-password': return 'Mật khẩu không đúng.';
            case 'auth/user-not-found': return 'Không tìm thấy người dùng với email này.';
            default: return 'Đã xảy ra lỗi xác thực. Vui lòng thử lại.';
        }
    }

    /**
     * Hàm để render thời khóa biểu cho một khối cụ thể và lắng nghe thay đổi từ Firestore.
     * Đồng thời, đảm bảo cấu trúc dữ liệu luôn khớp với số lượng khung giờ hiện tại
     * và lưu vào biến toàn cục `allSchedulesData` theo cấu trúc Array-of-Objects.
     * @param {string} khoiId - ID của khối (ví dụ: 'khoi6', 'khoi7').
     * @param {string} role - Vai trò của người dùng hiện tại ('admin', 'editor_khoiX', 'viewer', 'Editor').
     */
    function renderSchedule(khoiId, role) {
        const tbody = document.getElementById(`schedule-body-${khoiId}`);
        if (!tbody) {
            console.error(`Không tìm thấy tbody cho khối ${khoiId}`);
            return;
        }

        // Hủy đăng ký listener cũ nếu có để tránh trùng lặp hoặc rò rỉ bộ nhớ
        if (scheduleUnsubscribeFunctions[khoiId]) {
            scheduleUnsubscribeFunctions[khoiId]();
        }

        const docRef = db.collection("schedules").doc(khoiId);

        // Lắng nghe thay đổi của tài liệu thời khóa biểu trong Firestore
        scheduleUnsubscribeFunctions[khoiId] = docRef.onSnapshot(async doc => {
            let dataFromFirestore = doc.exists && doc.data().data ? doc.data().data : [];

            // --- BẮT ĐẦU PHẦN ĐẢM BẢO CẤU TRÚC DỮ LIỆU ---
            // Khởi tạo/cập nhật cấu trúc dữ liệu nếu không tồn tại, không phải mảng,
            // hoặc có độ dài không khớp với `periods.length`.
            // Chuẩn hóa thành Array-of-Objects: [{ day0: [], day1: [] }, ...]
            if (!doc.exists || !Array.isArray(dataFromFirestore) || dataFromFirestore.length !== periods.length) {
                console.warn(`Dữ liệu cho ${khoiId} bị thiếu hoặc có cấu trúc không hợp lệ (số lượng khung giờ không khớp). Đang khởi tạo lại/cập nhật cấu trúc.`);
                
                const newData = periods.map((_, pIdx) => {
                    const row = {};
                    for (let d = 0; d < COLS; d++) {
                        // Cố gắng bảo toàn dữ liệu hiện có cho từng ô nếu nó tồn tại và hợp lệ
                        row[`day${d}`] = (dataFromFirestore[pIdx] && dataFromFirestore[pIdx][`day${d}`] && Array.isArray(dataFromFirestore[pIdx][`day${d}`]))
                                                ? dataFromFirestore[pIdx][`day${d}`]
                                                : [];
                    }
                    return row;
                });
                
                // Lưu cấu trúc dữ liệu đã được điều chỉnh trở lại Firestore.
                // Điều này sẽ kích hoạt lại onSnapshot với dữ liệu chính xác.
                await docRef.set({ data: newData }); // Lưu vào trường 'data'
                return; // Thoát khỏi hàm để đợi listener được kích hoạt lại với dữ liệu mới
            }
            // --- KẾT THÚC PHẦN ĐẢM BẢO CẤU TRÚC DỮ LIỆU ---

            // Cập nhật biến toàn cục allSchedulesData
            allSchedulesData[khoiId] = dataFromFirestore;

            // Bắt đầu render bảng thời khóa biểu
            tbody.innerHTML = "";
            const groups = [periodsMorning, periodsAfternoon, periodsEvening];
            const titles = ["Buổi Sáng", "Buổi Chiều", "Buổi Tối"];

            let periodIndexInOverallPeriods = 0; // Index tổng thể cho từng khung giờ trong mảng `periods`
            groups.forEach((group, gIdx) => {
                tbody.innerHTML += `<tr><td colspan="${COLS + 1}" class="section-title">${titles[gIdx]}</td></tr>`;

                group.forEach(p => {
                    let row = `<tr><td><strong>${p.time}</strong></td>`;
                    for (let d = 0; d < COLS; d++) { // d là chỉ số ngày (0-6) tương ứng với Thứ 2 - CN
                        // Truy cập dữ liệu từ dataFromFirestore[periodIndexInOverallPeriods][`day${d}`]
                        const lessons = dataFromFirestore[periodIndexInOverallPeriods] && dataFromFirestore[periodIndexInOverallPeriods][`day${d}`]
                                                ? dataFromFirestore[periodIndexInOverallPeriods][`day${d}`]
                                                : [];
                        
                        let content = lessons.length ?
                            lessons.map(l => `<strong>${l.subject}</strong><br><small>${l.teacher}</small>`).join('<br>') :
                            "<span style='color:#aaa'>(trống)</span>";

                        // Xác định quyền chỉnh sửa
                        const isEditable = (role === 'admin' || role === `editor_${khoiId}` || role === 'Editor');
                        const cursorStyle = isEditable ? 'pointer' : 'default';
                        // Truyền periodIndexInOverallPeriods (idx), d (day index), và khoiId
                        const onClickHandler = isEditable ? `editCell(${periodIndexInOverallPeriods},${d},'${khoiId}')` : '';

                        row += `<td style="cursor:${cursorStyle}" onclick="${onClickHandler}">${content}</td>`;
                    }
                    row += "</tr>";
                    tbody.innerHTML += row;
                    periodIndexInOverallPeriods++;
                });
            });
        }, err => {
            console.error("Lỗi khi tải thời khóa biểu:", err);
            tbody.innerHTML = "<tr><td colspan='" + (COLS + 1) + "' style='color:red'>Lỗi tải dữ liệu. Vui lòng kiểm tra kết nối hoặc quyền truy cập.</td></tr>";
        });
    }

    // Hàm để tải và hiển thị tất cả thời khóa biểu
    function renderAllSchedules(userRole) {
        const khoiList = ['khoi6', 'khoi7', 'khoi8', 'khoi9', 'khoi10']; // Các khối cần hiển thị

        khoiList.forEach(khoiId => {
            renderSchedule(khoiId, userRole);
        });
    }

    // Hàm để xóa tất cả thời khóa biểu trên giao diện
    function clearAllSchedules() {
        const khoiList = ['khoi6', 'khoi7', 'khoi8', 'khoi9', 'khoi10'];
        khoiList.forEach(khoiId => {
            const tbody = document.getElementById(`schedule-body-${khoiId}`);
            if (tbody) {
                tbody.innerHTML = '';
            }
        });
        allSchedulesData = {}; // Xóa dữ liệu đã tải
    }

    // Chức năng chỉnh sửa ô thời khóa biểu (hàm toàn cục để có thể gọi từ HTML)
    window.editCell = async function (periodIdx, dayIdx, khoiId) {
        try {
            const docRef = db.collection("schedules").doc(khoiId);
            const doc = await docRef.get();
            if (!doc.exists) {
                console.error(`Tài liệu cho ${khoiId} không tồn tại.`);
                alert("Lỗi: Không tìm thấy dữ liệu thời khóa biểu cho khối này.");
                return;
            }

            let data = doc.data().data; // Lấy mảng 'data'
            
            // Kiểm tra an toàn trước khi truy cập
            if (!data || !Array.isArray(data) || periodIdx >= data.length || !data[periodIdx][`day${dayIdx}`]) {
                console.error(`Cấu trúc dữ liệu cho ${khoiId} không hợp lệ hoặc chỉ số periodIdx (${periodIdx}) hoặc dayIdx (${dayIdx}) nằm ngoài giới hạn.`);
                alert("Lỗi: Cấu trúc dữ liệu thời khóa biểu không hợp lệ hoặc dữ liệu bị thiếu. Vui lòng thử lại.");
                // Gọi lại renderSchedule để trigger việc khởi tạo/sửa cấu trúc
                renderSchedule(khoiId, auth.currentUser ? (await db.collection('users').doc(auth.currentUser.uid).get()).data().role : 'viewer');
                return;
            }

            const currentLessons = data[periodIdx][`day${dayIdx}`] || [];
            const currentInput = currentLessons.map(l => `${l.subject}, ${l.teacher}`).join('; ');
            // Cập nhật ví dụ nhập liệu để bao gồm tên lớp
            const inputPrompt = prompt("Nhập môn, giáo viên (vd: Toán 9.3, Thầy A; Lý 9.4, Cô B):", currentInput);

            if (inputPrompt === null) return; // Người dùng nhấn Hủy

            const newLessons = inputPrompt.split(';').map(s => {
                const parts = s.split(',').map(p => p.trim());
                const subject = parts[0] || '';
                const teacher = parts[1] || '';
                return { subject: subject, teacher: teacher };
            }).filter(l => l.subject); // Lọc bỏ các mục không có môn học

            // Cập nhật dữ liệu và lưu vào Firestore
            data[periodIdx][`day${dayIdx}`] = newLessons;
            await docRef.set({ data: data }, { merge: true }); // Cập nhật trường 'data'
            console.log(`Đã cập nhật ô [period: ${periodIdx}][day: ${dayIdx}] của ${khoiId}`);
        } catch (error) {
            console.error("Lỗi khi chỉnh sửa ô:", error);
            alert(`Lỗi khi cập nhật thời khóa biểu: ${getAuthErrorMessage(error.code) || error.message}`);
        }
    };

    // Xử lý nút "Bỏ chọn tất cả khung giờ"
    btnClearPeriods.addEventListener('click', () => {
        setAllCheckboxes(periodCheckboxesDiv, false);
    });

    // Xử lý nút "Chọn tất cả khung giờ"
    btnSelectAllPeriods.addEventListener('click', () => {
        setAllCheckboxes(periodCheckboxesDiv, true);
    });

    // Xử lý nút "Bỏ chọn tất cả ngày"
    btnClearDays.addEventListener('click', () => {
        setAllCheckboxes(dayCheckboxesDiv, false);
    });

    // Xử lý nút "Chọn tất cả ngày"
    btnSelectAllDays.addEventListener('click', () => {
        setAllCheckboxes(dayCheckboxesDiv, true);
    });

    // Hàm lọc thời khóa biểu và hiển thị kết quả
    btnFilter.addEventListener('click', () => {
        const selectedPeriodTimes = Array.from(periodCheckboxesDiv.querySelectorAll('input[type="checkbox"]:checked'))
                                           .map(cb => cb.value);
        const selectedDayIndices = Array.from(dayCheckboxesDiv.querySelectorAll('input[type="checkbox"]:checked'))
                                           .map(cb => parseInt(cb.value, 10)); // Chỉ số ngày 0-6

        let totalClasses = 0;
        const filteredClassDetails = []; 

        // Duyệt qua từng khối trong allSchedulesData
        for (const khoiId in allSchedulesData) {
            const scheduleDataArray = allSchedulesData[khoiId]; 
            const khoiNameFormatted = khoiId.replace('khoi', 'Khối ');

            // Lặp qua từng period (hàng) theo chỉ số
            periods.forEach((periodObj, pIdx) => {
                if (selectedPeriodTimes.includes(periodObj.time)) { 
                    const periodRowData = scheduleDataArray[pIdx]; 

                    if (periodRowData) {
                        // Lặp qua các ngày được chọn
                        selectedDayIndices.forEach(dIdx => {
                            const lessons = periodRowData[`day${dIdx}`] || [];
                            lessons.forEach(lesson => {
                                if (lesson && lesson.subject) { // Đảm bảo có môn học để hiển thị
                                    filteredClassDetails.push({
                                        subject: lesson.subject,
                                        teacher: lesson.teacher,
                                        khoi: khoiNameFormatted,
                                        day: days[dIdx], // Tên ngày (Thứ 2, Thứ 3, ...)
                                        period: periodObj.time, // Khung giờ
                                        periodGroup: getPeriodGroup(periodObj.time) // Thêm thông tin nhóm buổi
                                    });
                                    totalClasses++;
                                }
                            });
                        });
                    }
                }
            });
        }

        totalClassesCountSpan.textContent = totalClasses;
        classesByKhoiList.innerHTML = ''; // Xóa nội dung cũ

        if (filteredClassDetails.length > 0) {
            // Sắp xếp kết quả: Buổi -> Khối -> Ngày -> Tiết -> TÊN MÔN HỌC (Alpha B) -> TÊN GIÁO VIÊN (Alpha B)
            filteredClassDetails.sort((a, b) => {
                // Sắp xếp theo Buổi (Morning, Afternoon, Evening)
                const groupOrder = ['Buổi Sáng', 'Buổi Chiều', 'Buổi Tối'];
                const groupIdxA = groupOrder.indexOf(a.periodGroup);
                const groupIdxB = groupOrder.indexOf(b.periodGroup);
                if (groupIdxA !== groupIdxB) return groupIdxA - groupIdxB;

                // Sắp xếp theo khối (vd: Khối 6, Khối 7, ...)
                const khoiNumA = parseInt(a.khoi.replace('Khối ', ''));
                const khoiNumB = parseInt(b.khoi.replace('Khối ', ''));
                if (khoiNumA !== khoiNumB) return khoiNumA - khoiNumB;

                // Sắp xếp theo ngày (Thứ 2 đến CN)
                const dayOrder = days.indexOf(a.day) - days.indexOf(b.day);
                if (dayOrder !== 0) return dayOrder;

                // Sắp xếp theo tiết (thời gian) - dựa vào thứ tự trong mảng periods
                const periodOrderA = periods.findIndex(p => p.time === a.period);
                const periodOrderB = periods.findIndex(p => p.time === b.period);
                if (periodOrderA !== periodOrderB) return periodOrderA - periodOrderB;

                // Sắp xếp theo TÊN MÔN HỌC (ALPHABETICAL)
                const subjectOrder = a.subject.localeCompare(b.subject);
                if (subjectOrder !== 0) return subjectOrder;

                // THÊM SẮP XẾP THEO TÊN GIÁO VIÊN (ALPHABETICAL)
                return a.teacher.localeCompare(b.teacher);
            });

            // Nhóm kết quả theo Buổi, sau đó trong mỗi buổi lại nhóm theo Khối
            const groupedByPeriodAndKhoi = filteredClassDetails.reduce((acc, item) => {
                if (!acc[item.periodGroup]) {
                    acc[item.periodGroup] = {};
                }
                if (!acc[item.periodGroup][item.khoi]) {
                    acc[item.periodGroup][item.khoi] = [];
                }
                acc[item.periodGroup][item.khoi].push(item);
                return acc;
            }, {});

            // Duyệt và hiển thị kết quả đã nhóm
            const groupOrder = ['Buổi Sáng', 'Buổi Chiều', 'Buổi Tối']; // Đảm bảo thứ tự hiển thị các buổi
            groupOrder.forEach(groupName => {
                if (groupedByPeriodAndKhoi[groupName]) {
                    const groupLi = document.createElement('li');
                    groupLi.innerHTML = `<h3>${groupName}:</h3>`;
                    classesByKhoiList.appendChild(groupLi);

                    const khoiUl = document.createElement('ul');
                    khoiUl.style.listStyle = 'none';
                    khoiUl.style.paddingLeft = '10px';
                    groupLi.appendChild(khoiUl);

                    // Sắp xếp khối trong mỗi buổi
                    const sortedKhois = Object.keys(groupedByPeriodAndKhoi[groupName]).sort((a, b) => {
                        const khoiNumA = parseInt(a.replace('Khối ', ''));
                        const khoiNumB = parseInt(b.replace('Khối ', ''));
                        return khoiNumA - khoiNumB;
                    });

                    sortedKhois.forEach(khoiName => {
                        const khoiLi = document.createElement('li');
                        khoiLi.innerHTML = `<strong>${khoiName} (${groupedByPeriodAndKhoi[groupName][khoiName].length} lớp):</strong>`;
                        const ulDetail = document.createElement('ul');
                        ulDetail.style.listStyle = 'none'; 
                        ulDetail.style.paddingLeft = '15px'; 
                        khoiLi.appendChild(ulDetail);

                        groupedByPeriodAndKhoi[groupName][khoiName].forEach(item => {
                            const liDetail = document.createElement('li');
                            liDetail.textContent = `- ${item.subject} (${item.teacher}) - ${item.day} (${item.period})`;
                            ulDetail.appendChild(liDetail);
                        });
                        khoiUl.appendChild(khoiLi);
                    });
                }
            });

        } else {
            const li = document.createElement('li');
            li.textContent = 'Không có lớp nào trong các lựa chọn này.';
            classesByKhoiList.appendChild(li);
        }

        filterResultsDiv.style.display = 'block'; // Hiển thị kết quả lọc
        searchResultsTeacherDiv.style.display = 'none'; // Ẩn kết quả tìm kiếm giáo viên
    });

    // Hàm trợ giúp để xác định buổi từ khung giờ
    function getPeriodGroup(time) {
        if (periodsMorning.some(p => p.time === time)) {
            return 'Buổi Sáng';
        } else if (periodsAfternoon.some(p => p.time === time)) {
            return 'Buổi Chiều';
        } else if (periodsEvening.some(p => p.time === time)) {
            return 'Buổi Tối';
        }
        return 'Không xác định'; // Trường hợp không khớp
    }

    // Hàm trích xuất tên lớp từ tên môn học
    // Cố gắng bắt các định dạng: "Môn 9.3", "Môn 10A", "Môn 11B2", "Môn 12"
    // Regex này ưu tiên bắt các số và/hoặc chữ cái cuối cùng của chuỗi, 
    // giả định đó là tên lớp.
    function extractClassName(subject) {
        // Ví dụ: "Toán 9.3", "Văn 10A", "Lý 11B2", "Anh 12", "Hóa B"
        // Regex này tìm kiếm:
        // 1. Một hoặc nhiều chữ số, theo sau là dấu chấm, một hoặc nhiều chữ số (e.g., "9.3")
        // 2. HOẶC một hoặc nhiều chữ số, theo sau là một chữ cái (có thể là chữ in hoa hoặc thường), sau đó là không hoặc nhiều chữ số (e.g., "10A", "11B2")
        // 3. HOẶC một hoặc nhiều chữ số (e.g., "12")
        // 4. HOẶC một hoặc nhiều chữ cái (e.g., "A", "B" - nếu tên lớp chỉ là chữ cái)
        const match = subject.match(/(\d+\.\d+|\d+[a-zA-Z]\d*|\d+|[a-zA-Z]+)$/);
        if (match) {
            return match[1]; // Lấy nhóm khớp đầu tiên
        }
        return ''; // Không tìm thấy tên lớp cụ thể
    }

    // Hàm so sánh tên lớp cho việc sắp xếp
    function compareClassNames(a, b) {
        // Hàm trợ giúp để phân tích tên lớp thành các phần số và chữ
        const parseClassName = (name) => {
            // Tách phần số đầu tiên (ví dụ: 9 từ "9.3", 10 từ "10A")
            const numMatch = name.match(/^\d+/); 
            // Tách phần thập phân sau dấu chấm (ví dụ: 3 từ "9.3")
            const decimalMatch = name.match(/\.(\d+)/); 
            // Tách phần chữ cái sau số (ví dụ: A từ "10A", B2 từ "11B2")
            const alphaNumSuffixMatch = name.match(/(\d*[a-zA-Z]+\d*)$/); // ví dụ: "A", "B2", "10A" (nếu không có số đầu tiên)

            const numPart = numMatch ? parseInt(numMatch[0]) : 0;
            const decimalPart = decimalMatch ? parseInt(decimalMatch[1]) : 0;
            const alphaNumSuffix = alphaNumSuffixMatch ? alphaNumSuffixMatch[1].toLowerCase() : '';

            return { num: numPart, decimal: decimalPart, suffix: alphaNumSuffix };
        };

        const parsedA = parseClassName(a);
        const parsedB = parseClassName(b);

        // 1. Ưu tiên so sánh phần số chính (vd: 9 trước 10)
        if (parsedA.num !== parsedB.num) {
            return parsedA.num - parsedB.num;
        }

        // 2. Nếu phần số chính giống nhau, so sánh phần thập phân (vd: 9.3 trước 9.4)
        if (parsedA.decimal !== parsedB.decimal) {
            return parsedA.decimal - parsedB.decimal;
        }

        // 3. Nếu cả số và thập phân giống nhau, so sánh phần hậu tố chữ-số (vd: 10A trước 10B, 11B1 trước 11B2)
        // Đây là nơi mà "A" sẽ đứng trước "B" và "B1" trước "B2"
        return parsedA.suffix.localeCompare(parsedB.suffix);
    }


    // Hàm tìm kiếm giáo viên và hiển thị kết quả
    btnSearchTeacher.addEventListener('click', () => {
        const searchTeacherName = teacherNameInput.value.trim();
        if (!searchTeacherName) {
            alert('Vui lòng nhập tên giáo viên để tìm kiếm.');
            return;
        }

        let teacherFound = false;
        let foundClassesCount = 0;
        teacherClassesList.innerHTML = ''; // Xóa kết quả cũ
        filterResultsDiv.style.display = 'none'; // Ẩn kết quả lọc tổng số lớp

        const results = [];

        // Lặp qua tất cả dữ liệu thời khóa biểu của các khối
        for (const khoiId in allSchedulesData) {
            const scheduleDataArray = allSchedulesData[khoiId]; // Mảng dữ liệu thời khóa biểu cho khối
            const khoiNameFormatted = khoiId.replace('khoi', 'Khối ');

            // Lặp qua từng period (hàng) theo chỉ số
            scheduleDataArray.forEach((periodRowData, pIdx) => {
                // Lặp qua từng ngày trong tuần (day0 đến day6)
                for (let dIdx = 0; dIdx < COLS; dIdx++) {
                    const lessons = periodRowData[`day${dIdx}`] || [];
                    
                    lessons.forEach(lesson => {
                        // Kiểm tra xem tên giáo viên có khớp (không phân biệt hoa thường)
                        if (lesson && lesson.teacher && lesson.teacher.toLowerCase().includes(searchTeacherName.toLowerCase())) {
                            teacherFound = true;
                            foundClassesCount++;
                            results.push({
                                khoi: khoiNameFormatted,
                                day: days[dIdx], // Chuyển chỉ số ngày thành tên ngày (Thứ 2, Thứ 3,...)
                                period: periods[pIdx].time, // Lấy chuỗi thời gian từ mảng periods
                                subject: lesson.subject,
                                teacher: lesson.teacher,
                                className: extractClassName(lesson.subject) // Trích xuất tên lớp
                            });
                        }
                    });
                }
            });
        }

        // Sắp xếp kết quả:
        // 1. Theo tên lớp (ví dụ: 9.3 trước 9.4, 10A trước 10B)
        // 2. Theo tên môn học (theo bảng chữ cái)
        // 3. Nếu cùng tên lớp và môn, sắp xếp theo Khối
        // 4. Nếu cùng Khối, sắp xếp theo Ngày
        // 5. Nếu cùng Ngày, sắp xếp theo Tiết
        results.sort((a, b) => {
            // 1. Sắp xếp theo tên lớp (sử dụng hàm compareClassNames)
            const classNameOrder = compareClassNames(a.className, b.className);
            if (classNameOrder !== 0) return classNameOrder;

            // 2. Sắp xếp theo tên môn học (theo bảng chữ cái)
            const subjectOrder = a.subject.localeCompare(b.subject);
            if (subjectOrder !== 0) return subjectOrder;

            // 3. Sắp xếp theo khối (vd: Khối 6, Khối 7, ...)
            const khoiNumA = parseInt(a.khoi.replace('Khối ', ''));
            const khoiNumB = parseInt(b.khoi.replace('Khối ', ''));
            if (khoiNumA !== khoiNumB) return khoiNumA - khoiNumB;

            // 4. Sắp xếp theo ngày (Thứ 2 đến CN)
            const dayOrder = days.indexOf(a.day) - days.indexOf(b.day);
            if (dayOrder !== 0) return dayOrder;

            // 5. Sắp xếp theo tiết (thời gian) - dựa vào thứ tự trong mảng periods
            const periodOrderA = periods.findIndex(p => p.time === a.period);
            const periodOrderB = periods.findIndex(p => p.time === b.period);
            return periodOrderA - periodOrderB;
        });


        foundTeacherNameSpan.textContent = searchTeacherName;
        totalTeacherClassesCountSpan.textContent = foundClassesCount;

        if (results.length > 0) {
            // Nhóm các lớp cùng tên môn và tên lớp (ví dụ: Văn 9.3) để đánh số thứ tự
            const groupedBySubjectAndClassName = results.reduce((acc, item) => {
                // Sử dụng kết hợp môn học và tên lớp để tạo key nhóm
                // Chúng ta sẽ sắp xếp các key này sau đó
                const key = `${item.subject}@@@${item.className}`; // Sử dụng ký tự đặc biệt để đảm bảo key duy nhất
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(item);
                return acc;
            }, {});

            // Duyệt qua các nhóm đã sắp xếp theo thứ tự
            const sortedGroupKeys = Object.keys(groupedBySubjectAndClassName).sort((keyA, keyB) => {
                // Tách subject và className từ key để sắp xếp lại theo logic tổng thể
                const [subjectA, classNameA] = keyA.split('@@@');
                const [subjectB, classNameB] = keyB.split('@@@');

                const classNameOrder = compareClassNames(classNameA, classNameB);
                if (classNameOrder !== 0) return classNameOrder;

                return subjectA.localeCompare(subjectB);
            });

            sortedGroupKeys.forEach(key => {
                const classesInGroup = groupedBySubjectAndClassName[key];
                classesInGroup.forEach((item, index) => {
                    const li = document.createElement('li');
                    // Hiển thị số thứ tự nếu có nhiều hơn 1 lớp trong cùng nhóm subject/className
                    const orderPrefix = classesInGroup.length > 1 ? `(${index + 1}) ` : '';
                    li.innerHTML = `${orderPrefix}<strong>${item.subject}</strong> (${item.teacher}) - ${item.khoi} - ${item.day} (${item.period})`;
                    teacherClassesList.appendChild(li);
                });
            });

        } else {
            const li = document.createElement('li');
            li.textContent = `Không tìm thấy lớp nào cho giáo viên "${searchTeacherName}".`;
            teacherClassesList.appendChild(li);
        }

        searchResultsTeacherDiv.style.display = 'block'; // Hiển thị kết quả tìm kiếm giáo viên
    });
});