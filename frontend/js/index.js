
document.addEventListener("DOMContentLoaded", () => {
  // Header scrolled state
  const header = document.getElementById("main-header");
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 10) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
  }

  // Newsletter basic success handler
  const form = document.getElementById("newsletter-form");
  const success = document.getElementById("success-message");
  const emailInput = document.getElementById("email-input");
  if (form && success && emailInput) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      success.classList.remove("hidden");
      form.reset();
      setTimeout(() => {
        success.classList.add("hidden");
      }, 4000);
    });
  }
});
