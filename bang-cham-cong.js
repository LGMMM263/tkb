// bang-cham-cong.js
// Import các đối tượng db và auth từ file cấu hình Firebase của bạn
import { db, auth } from './config.js'; 

// Import các hàm Firestore cần thiết từ cùng một URL firebase-firestore.js
import { 
    collection, 
    getDocs,        // Dùng thay cho .get() trên collection
    query,          // Dùng để tạo truy vấn phức tạp
    where,          // Dùng để thêm điều kiện cho truy vấn
    limit,          // Dùng để giới hạn kết quả truy vấn
    onSnapshot,     // Dùng để lắng nghe thay đổi thời gian thực
    doc,            // Dùng để tham chiếu một tài liệu cụ thể
    setDoc,         // Dùng để ghi/cập nhật tài liệu
    addDoc,         // Dùng để thêm tài liệu mới với ID tự động
    serverTimestamp // Dùng thay cho firebase.firestore.FieldValue.serverTimestamp()
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";


// --- CÁC DÒNG DEBUG ĐÃ THÊM VÀO TRƯỚC ĐÓ (Giữ lại để bạn kiểm tra nếu cần) ---
console.log('DEBUG: Giá trị của db sau khi import:', db);
console.log('DEBUG: Kiểu của db:', typeof db);
if (db && typeof db === 'object') {
    console.log('DEBUG: db có phương thức .collection không?', typeof db.collection);
    if (typeof db.collection !== 'function') {
        console.error('DEBUG: db.collection không phải là hàm. Đây là nguyên nhân của lỗi!');
    }
} else {
    console.error('DEBUG: db không phải là đối tượng hoặc là null/undefined. Firebase Firestore có thể chưa được khởi tạo đúng cách.');
}
// --- KẾT THÚC CÁC DÒNG DEBUG ---


// Đối tượng này sẽ lưu trữ các hàm hủy đăng ký Firestore snapshot listeners.
const attendanceListeners = {}; 

document.addEventListener('DOMContentLoaded', () => {
    // Lấy các phần tử DOM
    const attendanceDataTable = document.getElementById('attendance-data-table');
    const daysHeaderRow = document.getElementById('days-header-row');
    const attendanceTableBody = attendanceDataTable ? attendanceDataTable.querySelector('tbody') : null;
    const monthSelect = document.getElementById('month-select');
    const employeeFilterSelect = document.getElementById('employee-filter-select');

    const newEmployeeNameInput = document.getElementById('new-employee-name');
    const newDateInput = document.getElementById('new-date');
    const newStatusSelect = document.getElementById('new-status');
    const newNoteInput = document.getElementById('new-note');
    const addAttendanceBtn = document.getElementById('add-attendance-btn');
    const addAttendanceError = document.getElementById('add-attendance-error');

    // Hàm tiện ích để tạo slug từ tên (không thay đổi)
    function createSlug(name) {
        return name.toLowerCase()
                   .normalize("NFD")
                   .replace(/[\u0300-\u036f]/g, "")
                   .replace(/đ/g, "d")
                   .replace(/[^a-z0-9\s-]/g, "")
                   .trim()
                   .replace(/\s+/g, '-');
    }

    // Hàm để tạo header các ngày trong tháng (không thay đổi)
    function generateDaysHeader(year, month) {
        if (!daysHeaderRow) return;

        daysHeaderRow.innerHTML = '';
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const th = document.createElement('th');
            th.textContent = i;
            daysHeaderRow.appendChild(th);
        }
    }

    // Hàm để tải và hiển thị dữ liệu chấm công từ Firestore
    async function loadAndRenderAttendanceTable(selectedMonth, selectedEmployeeId) {
        if (!attendanceTableBody) return;

        // Hủy bỏ listener cũ nếu có, để tránh lắng nghe nhiều lần
        Object.values(attendanceListeners).forEach(unsubscribe => unsubscribe());
        for (const key in attendanceListeners) {
            delete attendanceListeners[key];
        }

        attendanceTableBody.innerHTML = ''; // Xóa dữ liệu cũ

        const currentYear = new Date().getFullYear();
        generateDaysHeader(currentYear, parseInt(selectedMonth));

        const queryMonth = `${currentYear}-${String(selectedMonth).padStart(2, '0')}`;

        // Bước 1: Lấy danh sách nhân viên để hiển thị tên và điền vào bộ lọc
        let employees = {};
        try {
            // Sửa đổi: Sử dụng collection() và getDocs()
            const employeeSnapshot = await getDocs(collection(db, 'employees')); 
            employeeSnapshot.forEach(doc => {
                employees[doc.id] = doc.data().name;
            });
            // Cập nhật select box lọc nhân viên
            if (employeeFilterSelect) {
                const currentSelectedFilter = employeeFilterSelect.value;
                employeeFilterSelect.innerHTML = '<option value="">Tất cả</option>';
                for (const empId in employees) {
                    const option = document.createElement('option');
                    option.value = empId;
                    option.textContent = employees[empId];
                    if (empId === currentSelectedFilter) {
                        option.selected = true;
                    }
                    employeeFilterSelect.appendChild(option);
                }
            }
        } catch (error) {
            console.error("Lỗi khi tải danh sách nhân viên:", error);
            if (addAttendanceError) { 
                addAttendanceError.textContent = "Lỗi khi tải danh sách nhân viên.";
                addAttendanceError.style.color = 'red';
            }
        }

        // Bước 2: Lắng nghe thay đổi dữ liệu chấm công từ Firestore
        let attendanceDataByEmployee = {};

        // Sửa đổi: Sử dụng collection(), query() và where()
        let attendanceRecordsCollectionRef = collection(db, 'attendanceRecords');
        let attendanceQuery = query(
            attendanceRecordsCollectionRef, 
            where('monthYear', '==', queryMonth)
        );
        
        if (selectedEmployeeId) {
            // Sửa đổi: Thêm điều kiện where() vào query đã có
            attendanceQuery = query(
                attendanceQuery, 
                where('employeeId', '==', selectedEmployeeId)
            );
        }

        const listenerKey = `${queryMonth}-${selectedEmployeeId}`;

        // Sửa đổi: Sử dụng onSnapshot() trực tiếp với đối tượng query
        attendanceListeners[listenerKey] = onSnapshot(attendanceQuery, snapshot => {
            snapshot.docChanges().forEach(change => {
                const record = change.doc.data();
                const empId = record.employeeId;
                const dateKey = record.date;
                const status = record.status;
                const note = record.note || '';
                const empName = record.employeeName || employees[empId] || 'N/A';

                if (!attendanceDataByEmployee[empId]) {
                    attendanceDataByEmployee[empId] = {
                        id: empId,
                        name: empName,
                        attendance: {},
                        notes: {}
                    };
                }

                if (change.type === 'added' || change.type === 'modified') {
                    attendanceDataByEmployee[empId].attendance[dateKey] = status;
                    if (note) {
                        attendanceDataByEmployee[empId].notes[dateKey] = note;
                    } else {
                        delete attendanceDataByEmployee[empId].notes[dateKey];
                    }
                } else if (change.type === 'removed') {
                    if (attendanceDataByEmployee[empId]) {
                        delete attendanceDataByEmployee[empId].attendance[dateKey];
                        delete attendanceDataByEmployee[empId].notes[dateKey];
                        if (Object.keys(attendanceDataByEmployee[empId].attendance).length === 0) {
                            delete attendanceDataByEmployee[empId];
                        }
                    }
                }
            });
            const daysInMonth = new Date(currentYear, parseInt(selectedMonth), 0).getDate();
            drawTableContent(attendanceDataByEmployee, currentYear, parseInt(selectedMonth), daysInMonth);
        }, error => {
            console.error("Lỗi khi lắng nghe dữ liệu chấm công:", error);
            if (addAttendanceError) {
                addAttendanceError.textContent = "Lỗi khi tải dữ liệu chấm công.";
                addAttendanceError.style.color = 'red';
            }
        });
    }

    // Hàm vẽ nội dung bảng (không thay đổi)
    function drawTableContent(data, year, month, daysInMonth) {
        if (!attendanceTableBody) return;
        attendanceTableBody.innerHTML = '';

        let stt = 1;
        const sortedEmployees = Object.values(data).sort((a, b) => a.name.localeCompare(b.name));

        for (const employee of sortedEmployees) {
            const row = attendanceTableBody.insertRow();
            let totalDaysPresent = 0;
            let combinedNote = "";

            row.insertCell().textContent = stt++;
            row.insertCell().textContent = employee.name;

            for (let day = 1; day <= daysInMonth; day++) {
                const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const status = employee.attendance[dateKey] || '-';
                const cell = row.insertCell();
                cell.textContent = status;

                if (status === 'P') cell.classList.add('status-P');
                else if (status === 'K') cell.classList.add('status-K');
                else if (status === 'O') cell.classList.add('status-O');
                else if (status === 'C') cell.classList.add('status-C');

                if (status === 'X') {
                    totalDaysPresent++;
                }
                if (employee.notes[dateKey]) {
                    combinedNote += `Ngày ${day}: ${employee.notes[dateKey]}; `;
                }
            }

            row.insertCell().textContent = totalDaysPresent;
            row.insertCell().textContent = combinedNote.trim();
        }
    }

    // --- Xử lý sự kiện khi thay đổi tháng hoặc nhân viên lọc (không thay đổi) ---
    if (monthSelect) {
        monthSelect.addEventListener('change', () => {
            const selectedMonth = monthSelect.value;
            const selectedEmployee = employeeFilterSelect ? employeeFilterSelect.value : '';
            loadAndRenderAttendanceTable(selectedMonth, selectedEmployee);
        });
    }

    if (employeeFilterSelect) {
        employeeFilterSelect.addEventListener('change', () => {
            const selectedMonth = monthSelect ? monthSelect.value : String(new Date().getMonth() + 1).padStart(2, '0');
            const selectedEmployee = employeeFilterSelect.value;
            loadAndRenderAttendanceTable(selectedMonth, selectedEmployee);
        });
    }

    // --- Xử lý sự kiện nút "Thêm Chấm Công" ---
    if (addAttendanceBtn) {
        addAttendanceBtn.addEventListener('click', async () => {
            if (addAttendanceError) {
                addAttendanceError.textContent = '';
                addAttendanceError.style.color = 'red';
            }

            const name = newEmployeeNameInput.value.trim();
            const date = newDateInput.value;
            const status = newStatusSelect.value;
            const note = newNoteInput.value.trim();

            if (!name || !date || !!status) {
                if (addAttendanceError) addAttendanceError.textContent = 'Vui lòng điền đầy đủ Họ và tên, Ngày và Trạng thái.';
                return;
            }

            // Đảm bảo auth.currentUser tồn tại trước khi dùng (nếu có yêu cầu đăng nhập để thêm)
            if (!auth.currentUser) {
                if (addAttendanceError) addAttendanceError.textContent = 'Bạn cần đăng nhập để thêm chấm công.';
                return;
            }

            const [year, month, day] = date.split('-').map(Number);
            const formattedDateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const monthYear = `${year}-${String(month).padStart(2, '0')}`;

            try {
                let employeeId = null;
                // Sửa đổi: Sử dụng collection(), query(), where() và getDocs()
                const employeesCollectionRef = collection(db, 'employees');
                const existingEmployeeQuery = query(employeesCollectionRef, where('name', '==', name), limit(1));
                const existingEmployeeSnapshot = await getDocs(existingEmployeeQuery);

                if (existingEmployeeSnapshot.empty) {
                    // Sửa đổi: Sử dụng addDoc()
                    const newEmployeeRef = await addDoc(employeesCollectionRef, {
                        name: name,
                        createdAt: serverTimestamp() // Sửa đổi: Sử dụng serverTimestamp() đã import
                    });
                    employeeId = newEmployeeRef.id;
                    console.log(`Đã thêm nhân viên mới: ${name} với ID: ${employeeId}`);
                } else {
                    employeeId = existingEmployeeSnapshot.docs[0].id;
                }

                // Sửa đổi: Sử dụng collection() và doc() để tạo tham chiếu tài liệu
                const attendanceRecordsCollectionRef = collection(db, 'attendanceRecords');
                const attendanceRecordDocRef = doc(attendanceRecordsCollectionRef, `${employeeId}_${formattedDateKey}`);
                
                // Sửa đổi: Sử dụng setDoc()
                await setDoc(attendanceRecordDocRef, {
                    employeeId: employeeId,
                    employeeName: name,
                    date: formattedDateKey,
                    monthYear: monthYear,
                    status: status,
                    note: note,
                    recordedBy: auth.currentUser.uid,
                    createdAt: serverTimestamp() // Sửa đổi: Sử dụng serverTimestamp() đã import
                }, { merge: true });

                if (addAttendanceError) {
                    addAttendanceError.textContent = 'Thêm chấm công thành công!';
                    addAttendanceError.style.color = 'green';
                }

                newEmployeeNameInput.value = '';
                newDateInput.value = '';
                newStatusSelect.value = 'X';
                newNoteInput.value = '';

            } catch (error) {
                console.error("Lỗi khi thêm chấm công:", error);
                if (addAttendanceError) {
                    addAttendanceError.textContent = `Lỗi: ${error.message}`;
                    addAttendanceError.style.color = 'red';
                }
            }
        });
    }

    // --- Khởi tạo khi tải trang ---
    const today = new Date();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentYear = today.getFullYear();

    if (monthSelect) {
        monthSelect.value = currentMonth;
    }
    if (newDateInput) {
        const defaultDate = `${currentYear}-${currentMonth}-${String(today.getDate()).padStart(2, '0')}`;
        newDateInput.value = defaultDate;
    }

    loadAndRenderAttendanceTable(currentMonth, '');
});