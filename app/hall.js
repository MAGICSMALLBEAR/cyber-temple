// 香油箱只使用遊戲內功德，與現金無關；籤詩櫃接回現有護照紀錄。
const hallActivities = {
  openDonation() {
    this.refresh();
    document.getElementById("donationModal").classList.add("open");
  },
  refresh(message = "") {
    const balance = state.meritCount;
    document.getElementById("donationBalance").textContent = balance.toLocaleString();
    const total = Math.max(0, Number(localStorage.getItem("temple_donation_total")) || 0);
    document.getElementById("donationTotal").textContent = total.toLocaleString();
    document.getElementById("donationMessage").textContent = message;
    document.querySelectorAll("[data-donation]").forEach(btn => { btn.disabled = balance < Number(btn.dataset.donation); });
  },
  donate(amount) {
    if (![10, 30, 100].includes(amount) || state.meritCount < amount) {
      this.refresh("目前功德不足，可先參拜累積功德。");
      return;
    }
    window.addMerit(-amount);
    const total = Math.max(0, Number(localStorage.getItem("temple_donation_total")) || 0) + amount;
    localStorage.setItem("temple_donation_total", String(total));
    this.refresh(`隨喜奉獻 ${amount} 功德，感謝護持。`);
    window.templeAudio?.playBell(620);
    window.emitRitual?.("donation", { amount });
    window.temple3d?.spawn3DFloatingText("隨喜護持 • 廣結善緣", new THREE.Vector3(-2.8, 1.6, 3));
  },
  init() {
    const modal = document.getElementById("donationModal");
    document.getElementById("donationModalClose").addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
    document.querySelectorAll("[data-donation]").forEach(btn => btn.addEventListener("click", () => this.donate(Number(btn.dataset.donation))));
  }
};
window.hallActivities = hallActivities;
