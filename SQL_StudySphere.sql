-- ===========================
-- Tạo bảng
-- ===========================
IF OBJECT_ID('dbo.Tasks', 'U') IS NOT NULL
    DROP TABLE dbo.Tasks;

IF OBJECT_ID('dbo.Subjects', 'U') IS NOT NULL
    DROP TABLE dbo.Subjects;

CREATE TABLE dbo.Subjects (
    SubjectId INT PRIMARY KEY,
    SubjectName NVARCHAR(200) NOT NULL,
    SubjectCode VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE dbo.Tasks (
    TaskId INT PRIMARY KEY,
    TaskName NVARCHAR(300) NOT NULL,
    Deadline DATETIME2 NOT NULL,
    Priority INT NOT NULL CHECK (Priority BETWEEN 1 AND 5),
    Status VARCHAR(20) NOT NULL CHECK (Status IN ('Pending', 'InProgress', 'Done', 'Cancelled')),
    SubjectId INT NOT NULL,
    CONSTRAINT FK_Tasks_Subjects FOREIGN KEY (SubjectId) REFERENCES dbo.Subjects(SubjectId)
);

-- ===========================
-- Dữ liệu mẫu Subjects (6 môn)
-- ===========================
INSERT INTO dbo.Subjects (SubjectId, SubjectName, SubjectCode)
VALUES
(1, N'Toán học', 'MATH101'),
(2, N'Ngôn ngữ lập trình', 'PROG201'),
(3, N'Cơ sở dữ liệu', 'DB301'),
(4, N'Mạng máy tính', 'NET201'),
(5, N'Thiết kế web', 'WEB301'),
(6, N'Tiếng Anh', 'ENG201');

-- ===========================
-- Dữ liệu mẫu Tasks (18 task)
-- ===========================
INSERT INTO dbo.Tasks (TaskId, TaskName, Deadline, Priority, Status, SubjectId)
VALUES
(1, N'Ôn tập chương 1', '2026-10-20 23:59:00', 3, 'Pending', 1),
(2, N'Làm bài tập đạo hàm', '2026-10-22 18:00:00', 4, 'InProgress', 1),
(3, N'Xây dựng đề cương ôn thi', '2026-10-25 17:00:00', 2, 'Pending', 1),

(4, N'Bài tập Java cơ bản', '2026-10-21 08:00:00', 5, 'Done', 2),
(5, N'Viết chương trình quản lý sinh viên', '2026-10-26 23:59:00', 4, 'InProgress', 2),
(6, N'Fix lỗi bài tập C#', '2026-10-28 20:00:00', 3, 'Pending', 2),

(7, N'Thiết kế ERD cho hệ thống học tập', '2026-10-24 15:00:00', 5, 'InProgress', 3),
(8, N'Tạo SQL script tạo bảng', '2026-10-27 09:00:00', 4, 'Pending', 3),
(9, N'Chạy truy vấn thống kê điểm', '2026-10-30 12:00:00', 3, 'Pending', 3),

(10, N'Tìm hiểu mô hình TCP/IP', '2026-10-23 10:00:00', 2, 'Done', 4),
(11, N'Làm báo cáo mạng LAN', '2026-10-29 16:00:00', 3, 'Pending', 4),
(12, N'Phân tích lỗi kết nối Wi-Fi', '2026-11-02 19:00:00', 4, 'InProgress', 4),

(13, N'Thiết kế giao diện landing page', '2026-10-21 23:00:00', 5, 'InProgress', 5),
(14, N'Viết HTML + CSS cho dashboard', '2026-10-27 14:00:00', 4, 'Pending', 5),
(15, N'Hoàn thiện UI responsive', '2026-11-01 17:00:00', 3, 'Pending', 5),

(16, N'Luyện nghe tiếng Anh theo chủ đề học tập', '2026-10-22 08:30:00', 2, 'Done', 6),
(17, N'Viết đoạn văn mô tả kế hoạch học tập', '2026-10-26 18:00:00', 3, 'Pending', 6),
(18, N'Luyện speaking 5 phút', '2026-10-31 21:00:00', 4, 'InProgress', 6);

-- ===========================
-- Kiểm tra dữ liệu
-- ===========================
SELECT 
    t.TaskId,
    t.TaskName,
    t.Deadline,
    t.Priority,
    t.Status,
    s.SubjectId,
    s.SubjectName,
    s.SubjectCode
FROM dbo.Tasks t
INNER JOIN dbo.Subjects s ON t.SubjectId = s.SubjectId
ORDER BY t.TaskId;