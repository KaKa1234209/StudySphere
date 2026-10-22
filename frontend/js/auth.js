// ==========================================================
// auth.js – Xử lý Đăng nhập, Đăng ký và Hồ sơ cá nhân (Thành viên 3)
// ==========================================================
(() => {
  const $ = id => document.getElementById(id);

  // 1. Trang Đăng nhập (login.html)
  const loginForm = $("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("email").value.trim();
      const password = $("password").value;
      $("authError").textContent = "";

      try {
        const res = await Api.auth.login({ email, password });
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        location.href = "dashboard.html";
      } catch (err) {
        $("authError").textContent = err.message;
      }
    });
  }

  // 2. Trang Đăng ký (register.html)
  const registerForm = $("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async e => {
      e.preventDefault();
      const full_name = $("fullName").value.trim();
      const email = $("email").value.trim();
      const password = $("password").value;
      $("authError").textContent = "";

      try {
        const res = await Api.auth.register({ full_name, email, password });
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        location.href = "dashboard.html";
      } catch (err) {
        $("authError").textContent = err.message;
      }
    });
  }

  // 3. Trang Hồ sơ cá nhân (profile.html)
  const profileForm = $("profileForm");
  if (profileForm) {
    async function loadProfile() {
      try {
        const u = await Api.auth.me();
        localStorage.setItem("user", JSON.stringify(u));
        $("pf-name").value = u.full_name || u.name || "";
        $("pf-email").value = u.email || "";
        $("pfHeroName").textContent = u.full_name || u.name || "Hồ sơ cá nhân";
        $("pfHeroEmail").textContent = u.email || "";
        $("pfRole").textContent = String(u.role || "user").toUpperCase();
      } catch (err) {
        if (typeof toast === "function") toast(err.message);
      }
    }

    profileForm.addEventListener("submit", async e => {
      e.preventDefault();
      $("pf-error").textContent = "";
      try {
        const updated = await Api.auth.updateProfile({
          full_name: $("pf-name").value.trim(),
          email: $("pf-email").value.trim(),
        });
        localStorage.setItem("user", JSON.stringify(updated));
        $("pfHeroName").textContent = updated.full_name || updated.name;
        $("pfHeroEmail").textContent = updated.email;
        if (typeof toast === "function") toast("Đã lưu thông tin hồ sơ!");
      } catch (err) {
        $("pf-error").textContent = err.message;
      }
    });

    const passwordForm = $("passwordForm");
    if (passwordForm) {
      passwordForm.addEventListener("submit", async e => {
        e.preventDefault();
        $("pw-error").textContent = "";
        try {
          await Api.auth.changePassword({
            current_password: $("pw-current").value,
            new_password: $("pw-new").value,
          });
          $("pw-current").value = "";
          $("pw-new").value = "";
          if (typeof toast === "function") toast("Đổi mật khẩu thành công!");
        } catch (err) {
          $("pw-error").textContent = err.message;
        }
      });
    }

    loadProfile();
  }
})();
