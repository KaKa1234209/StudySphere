// Lỗi có mã HTTP, để error-handler trả đúng status cho client
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
module.exports = AppError;