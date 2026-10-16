
const EMAILJS = {
  publicKey:  "OAotPyOTtNvxpbR7R",
  serviceId:  "service_qkulm1i",
  templateId: "template_jxh7zen"
};


const movies = [
  { id: 1, title: "Midnight Express",  price: 250, genre: "Thriller", showtimes: ["10:00 AM", "1:30 PM", "7:00 PM"] },
  { id: 2, title: "Stellar Drift",     price: 350, genre: "Sci-Fi",   showtimes: ["11:00 AM", "3:00 PM", "9:00 PM"] },
  { id: 3, title: "Laugh Lines",       price: 180, genre: "Comedy",   showtimes: ["12:00 PM", "4:30 PM", "8:00 PM"] },
  { id: 4, title: "The Last Monsoon",  price: 300, genre: "Drama",    showtimes: ["10:30 AM", "2:00 PM", "6:30 PM"] }
];
const MAX_TICKETS = 10;
let bookings = [];
let nextId = 1001;


const $ = id => document.getElementById(id);
const form = $("bookingForm"), movieSel = $("movie"), timeSel = $("showtime");
const qtyInput = $("quantity"), emailInput = $("email");
const msgBox = $("message"), bookBtn = $("bookBtn");

const money = n => "₹" + n.toLocaleString("en-IN");
const getMovie = id => movies.find(m => m.id === Number(id));

function showMessage(text, type) {
  msgBox.textContent = text;
  msgBox.className = "message " + type;
  msgBox.hidden = false;
}
function clearMessage() { msgBox.hidden = true; }

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function parseQuantity(raw) {
  const s = raw.trim();
  if (!/^[1-9]\d*$/.test(s)) return null;
  const n = Number(s);
  return Number.isInteger(n) && n <= MAX_TICKETS ? n : null;
}


function renderMovies() {
  $("movieList").innerHTML = "";
  movieSel.innerHTML = "";
  movies.forEach(m => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "movie";
    btn.dataset.id = m.id;
    btn.innerHTML = `<span><strong>${m.title}</strong><small>${m.genre} · ${m.showtimes.length} shows daily</small></span>
                     <span class="price">${money(m.price)}</span>`;
    $("movieList").appendChild(btn);

    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.title} (${money(m.price)})`;
    movieSel.appendChild(opt);
  });
  syncMovie();
}

function syncMovie() {
  const m = getMovie(movieSel.value);
  timeSel.innerHTML = "";
  m.showtimes.forEach(t => {
    const o = document.createElement("option");
    o.value = t; o.textContent = t;
    timeSel.appendChild(o);
  });
  document.querySelectorAll(".movie").forEach(el =>
    el.classList.toggle("selected", Number(el.dataset.id) === m.id));
  updateSummary();
}

function updateSummary() {
  const m = getMovie(movieSel.value);
  const qty = parseQuantity(qtyInput.value);
  if (qty) {
    $("summaryText").textContent = `${qty} × ${m.title} @ ${money(m.price)}`;
    $("summaryTotal").textContent = money(qty * m.price);
  } else {
    $("summaryText").textContent = `${m.title} @ ${money(m.price)} per ticket`;
    $("summaryTotal").textContent = money(0);
  }
}

function renderBookings() {
  const term = $("search").value.trim().toLowerCase();
  const list = $("bookingList");
  list.innerHTML = "";
  $("bookingCount").textContent = bookings.length;

  const shown = bookings.filter(b =>
    b.movie.toLowerCase().includes(term) ||
    b.email.toLowerCase().includes(term) ||
    String(b.id).includes(term));

  if (shown.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = bookings.length === 0
      ? "No bookings yet. Pick a movie and book your first ticket."
      : "No bookings match your search.";
    list.appendChild(li);
    return;
  }
  shown.forEach(b => {
    const li = document.createElement("li");
    li.className = "booking";
    li.innerHTML = `<div>
        <p><strong>${b.movie}</strong> – ${b.showtime}</p>
        <p>${b.quantity} ticket${b.quantity > 1 ? "s" : ""} · ${money(b.total)}</p>
        <p class="id">#${b.id} · ${b.email}</p>
      </div>
      <button type="button" class="cancel" data-id="${b.id}">Cancel booking</button>`;
    list.appendChild(li);
  });
}


function sendConfirmation(b) {
  if (!window.emailjs || EMAILJS.publicKey.startsWith("YOUR_")) {
    return Promise.reject(new Error("Email service is not configured. Add your EmailJS IDs in script.js."));
  }
  emailjs.init({ publicKey: EMAILJS.publicKey });
  return emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, {
    to_email: b.email,
    booking_id: b.id,
    movie: b.movie,
    showtime: b.showtime,
    quantity: b.quantity,
    total: money(b.total)
  });
}


movieSel.addEventListener("change", syncMovie);
qtyInput.addEventListener("input", () => { qtyInput.classList.remove("invalid"); updateSummary(); });
emailInput.addEventListener("input", () => emailInput.classList.remove("invalid"));

$("movieList").addEventListener("click", e => {
  const card = e.target.closest(".movie");
  if (!card) return;
  movieSel.value = card.dataset.id;
  syncMovie();
});

form.addEventListener("submit", async e => {
  e.preventDefault();           // stop page refresh
  clearMessage();
  qtyInput.classList.remove("invalid");
  emailInput.classList.remove("invalid");

  const qty = parseQuantity(qtyInput.value);
  const email = emailInput.value.trim();

  if (!qty) {
    qtyInput.classList.add("invalid");
    return showMessage(`Enter a whole number of tickets from 1 to ${MAX_TICKETS}.`, "error");
  }
  if (!isValidEmail(email)) {
    emailInput.classList.add("invalid");
    return showMessage("Enter a valid email address, like name@example.com.", "error");
  }

  const m = getMovie(movieSel.value);
  const booking = {
    id: nextId, movie: m.title, showtime: timeSel.value,
    quantity: qty, total: qty * m.price, email
  };

  bookBtn.disabled = true;
  bookBtn.textContent = "Sending confirmation…";
  try {
    await sendConfirmation(booking);      
    nextId++;
    bookings.push(booking);
    renderBookings();
    showMessage(`Booked! Confirmation sent to ${email}.`, "success");
    qtyInput.value = "";
    updateSummary();
  } catch (err) {
    console.error(err);
    showMessage(err.message && err.message.includes("not configured")
      ? err.message
      : "Booking not saved: the confirmation email could not be sent. Try again.", "error");
  } finally {
    bookBtn.disabled = false;
    bookBtn.textContent = "Book & email ticket";
  }
});

$("resetBtn").addEventListener("click", () => {
  form.reset();
  qtyInput.classList.remove("invalid");
  emailInput.classList.remove("invalid");
  clearMessage();
  syncMovie();
});

$("bookingList").addEventListener("click", e => {
  const btn = e.target.closest(".cancel");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  bookings = bookings.filter(b => b.id !== id);
  renderBookings();
  showMessage(`Booking #${id} cancelled.`, "info");
});

$("search").addEventListener("input", renderBookings);


renderMovies();
renderBookings();
