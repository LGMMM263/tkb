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

const periodsMorning = [
    { time: "8h-10h" }, // Đã thay đổi "8h-10h" thành ""
    { time: "8h-11h" }, // Đã bỏ 'label: "Tiết 2"'
    { time: "8h-9h30" }, // Đã bỏ 'label: "Tiết 3"'
    { time: "08h30-11h" }, // Đã bỏ 'label: "Tiết 4"'
    { time: "8h30-11h30" },
    { time: "9h45-11h15" }

];
const periodsAfternoon = [
    { time: "14h - 15h30" }, // Đã thay đổi "8h-10h" thành ""
    { time: "14h - 16h" }, // Đã bỏ 'label: "Tiết 2"'
    { time: "14h-16h30" }, // Đã bỏ 'label: "Tiết 3"'
    { time: "14h-17h" }, // Đã bỏ 'label: "Tiết 4"'
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
const COLS = 7;
const scheduleUnsubscribeFunctions = {};

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
    }
});

btnLogout.addEventListener("click", () => {
    auth.signOut();
});

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
            console.error("Lỗi khi lấy vai trò:", err);
        }
        renderAllSchedules(userRole);
    } else {
        clearAllSchedules();
        for (const key in scheduleUnsubscribeFunctions) {
            scheduleUnsubscribeFunctions[key]();
            delete scheduleUnsubscribeFunctions[key];
        }
        authSection.style.display = "block";
        scheduleContainer.style.display = "none";
        btnLogout.style.display = "none";
    }
});

function getAuthErrorMessage(code) {
    switch (code) {
        case 'auth/email-already-in-use': return 'Email đã được sử dụng.';
        case 'auth/invalid-email': return 'Email không hợp lệ.';
        case 'auth/weak-password': return 'Mật khẩu quá yếu.';
        case 'auth/user-not-found': return 'Người dùng không tồn tại.';
        case 'auth/wrong-password': return 'Sai mật khẩu.';
        default: return 'Lỗi xác thực.';
    }
}

// Hiển thị thời khóa biểu
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
        const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
        let idx = 0;
        groups.forEach((group, gIdx) => {
            tbody.innerHTML += `<tr><td colspan="${COLS + 1}" class="section-title">${titles[gIdx]}</td></tr>`;
            tbody.innerHTML += `<tr><th>Tiết</th>${days.map(d => `<th>${d}</th>`).join('')}</tr>`;
            group.forEach(p => {
                // Đã thêm điều kiện để hiển thị nhãn (label) nếu có
                let row = `<tr><td><strong>${p.label ? p.label : ''}</strong><br><small>${p.time}</small></td>`;
                for (let d = 0; d < COLS; d++) {
                    const lessons = data[idx]?.[`day${d}`] || [];
                    let content = lessons.length ?
                        lessons.map(l => `<strong>${l.subject}</strong><br><small>${l.teacher}</small>`).join('<br>') :
                        "<span style='color:#aaa'>(trống)</span>";
                    row += `<td style="cursor:${(role === 'admin' || role === `editor_${khoiId}`) ? 'pointer' : 'default'}" onclick="${(role === 'admin' || role === `editor_${khoiId}`) ? `editCell(${idx},${d},'${khoiId}')` : ''}">${content}</td>`;
                }
                row += "</tr>";
                tbody.innerHTML += row;
                idx++;
            });
        });
    }, err => {
        console.error(err);
        tbody.innerHTML = "<tr><td colspan='" + (COLS + 1) + "' style='color:red'>Lỗi tải dữ liệu</td></tr>";
    });
}

// Chỉnh sửa ô thời khóa biểu
window.editCell = async function (i, j, khoiId) {
    const doc = await db.collection("schedules").doc(khoiId).get();
    let data = doc.data().data;
    const lessons = data[i][`day${j}`] || [];
    const current = lessons.map(l => `${l.subject}, ${l.teacher}`).join('; ');
    const input = prompt("Nhập môn, giáo viên (vd: Toán, Thầy A; Lý, Cô B):", current);
    if (input === null) return;
    const newLessons = input.split(';').map(s => {
        const [subject, teacher = ''] = s.split(',').map(p => p.trim());
        return { subject, teacher };
    }).filter(l => l.subject);
    data[i][`day${j}`] = newLessons;
    await db.collection("schedules").doc(khoiId).set({ data }, { merge: true });
};