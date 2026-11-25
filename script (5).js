/* ==========================================================
   Honey Hungry — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : โหลดสินค้า + ปุ่มกรอง mood + ลิงก์สั่งซื้อ
   - order.html   : เติมฟอร์มจาก URL parameter + เก็บออเดอร์ลง localStorage
   - admin.html   : แสดงออเดอร์จาก localStorage
   ========================================================== */

const ORDERS_KEY = "bodyScentOrders";

/* class สีประจำรส (ตรงกับ style.css) */
const MOOD_CLASS = {
  "รสดั้งเดิม": "mood--original",
  "รสมะลิ": "mood--jasmine",
  "รสหอมหมื่นลี้": "mood--osmanthus",
  "รสกุหลาบ": "mood--rose",
  "รสเกลือ": "mood--salt",
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("product-list")) initProductPage();
  if (document.getElementById("orderForm")) initOrderPage();
  if (document.getElementById("ordersTable")) initAdminPage();
});

/* ==========================================================
   1) หน้าสินค้า (product.html)
   ========================================================== */
let allProducts = [];

async function initProductPage() {
  const list = document.getElementById("product-list");
  const bar = document.getElementById("filter-bar");

  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    allProducts = await res.json();
  } catch (err) {
    console.error(err);
    list.textContent = "ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง";
    return;
  }

  // สร้างปุ่มกรองจากค่า mood ที่มีอยู่จริงใน products.json
  const moods = [...new Set(allProducts.map((p) => p.mood))];
  const initial = resolveMoodParam(
    new URLSearchParams(window.location.search).get("mood"),
    moods
  );

  if (bar) {
    bar.innerHTML = "";
    ["ทั้งหมด", ...moods].forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-btn";
      btn.textContent = m;
      btn.dataset.mood = m === "ทั้งหมด" ? "all" : m;
      btn.addEventListener("click", () => applyFilter(btn.dataset.mood));
      bar.appendChild(btn);
    });
  }

  applyFilter(initial);
}

/* แปลงค่า ?mood=xxx ให้ตรงกับ mood จริง (รองรับพิมพ์ไม่ใส่คำว่า "รส") */
function resolveMoodParam(param, moods) {
  if (!param) return "all";
  const v = param.trim();
  if (!v || v.toLowerCase() === "all" || v === "ทั้งหมด") return "all";
  const found = moods.find((m) => m === v || m === "รส" + v || m.replace(/^รส/, "") === v);
  return found || "all";
}

function applyFilter(mood) {
  document.querySelectorAll("#filter-bar .filter-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mood === mood);
  });
  const items = mood === "all" ? allProducts : allProducts.filter((p) => p.mood === mood);
  renderProducts(items);
}

function renderProducts(items) {
  const list = document.getElementById("product-list");
  list.innerHTML = "";

  if (!items.length) {
    list.textContent = "ไม่พบสินค้าในหมวดนี้";
    return;
  }

  items.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";

    // รูป
    const media = document.createElement("div");
    media.className = "card-media";
    const img = document.createElement("img");
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove());
    media.appendChild(img);

    // เนื้อหา
    const body = document.createElement("div");
    body.className = "card-body";

    const type = document.createElement("div");
    type.className = "card-type";
    type.textContent = p.type;

    const mood = document.createElement("span");
    mood.className = "mood " + (MOOD_CLASS[p.mood] || "");
    mood.textContent = p.mood;

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = p.name;

    const desc = document.createElement("p");
    desc.className = "card-desc";
    desc.textContent = p.description;

    // ราคา + ไซส์
    const foot = document.createElement("div");
    foot.className = "card-foot";

    const price = document.createElement("span");
    price.className = "price";
    price.textContent = Number(p.price).toLocaleString("th-TH");
    const unit = document.createElement("small");
    unit.textContent = "บาท";
    price.appendChild(unit);

    const size = document.createElement("span");
    size.className = "size";
    size.textContent = p.size;

    foot.append(price, size);

    // ปุ่มสั่งซื้อ -> order.html?item=...&price=...
    const params = new URLSearchParams({
      item: p.name + " " + p.size,
      price: String(p.price),
    });
    const buy = document.createElement("a");
    buy.className = "btn btn--gold btn--sm";
    buy.href = "order.html?" + params.toString();
    buy.textContent = "สั่งซื้อ";
    buy.style.marginTop = "1rem";
    buy.style.textAlign = "center";

    body.append(type, mood, title, desc, foot, buy);
    card.append(media, body);
    list.appendChild(card);
  });
}

/* ==========================================================
   2) หน้าสั่งซื้อ (order.html)
   ========================================================== */
function initOrderPage() {
  const form = document.getElementById("orderForm");
  const params = new URLSearchParams(window.location.search);

  // เติมช่องสินค้า (#items) และราคา (#total) อัตโนมัติ
  const item = params.get("item");
  const price = params.get("price");
  const itemsEl = document.getElementById("items");
  const totalEl = document.getElementById("total");
  if (itemsEl && item !== null) itemsEl.value = item;
  if (totalEl && price !== null) totalEl.value = price;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      customerName: document.getElementById("customerName").value.trim(),
      contact: document.getElementById("contact").value.trim(),
      items: document.getElementById("items").value.trim(),
      total: document.getElementById("total").value.trim(),
      note: document.getElementById("note").value.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      let orders = [];
      const raw = localStorage.getItem(ORDERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) orders = parsed;
      }
      orders.push(payload);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง");
      return;
    }

    window.location.href = "thankyou.html";
  });
}

/* ==========================================================
   3) หน้าแอดมิน (admin.html)
   ========================================================== */
function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  tbody.innerHTML = "";

  let orders = [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) orders = parsed;
    }
  } catch (err) {
    console.error(err);
  }

  if (!orders.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "ยังไม่มีคำสั่งซื้อ";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  // เรียงจาก timestamp ล่าสุดขึ้นก่อน
  const time = (o) => {
    const t = new Date(o && o.timestamp).getTime();
    return isNaN(t) ? 0 : t;
  };
  orders.sort((a, b) => time(b) - time(a));

  orders.forEach((o) => {
    const d = new Date(o.timestamp);
    const when = isNaN(d.getTime()) ? "" : d.toLocaleString("th-TH");
    const cells = [when, o.customerName, o.contact, o.items, o.total, o.note];

    const tr = document.createElement("tr");
    cells.forEach((c) => {
      const td = document.createElement("td");
      td.textContent = c == null ? "" : String(c);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}
