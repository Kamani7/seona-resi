// --- UTILITAIRES STORAGE ---
// Envoi de fichiers vers Firebase Storage au lieu d'utiliser du Base64
async function uploadFileToStorage(file, path) {
  try {
    const fileRef = storage.ref(`${path}/${Date.now()}_${file.name}`);
    const snapshot = await fileRef.put(file);
    return await snapshot.ref.getDownloadURL();
  } catch (error) {
    console.error("Erreur lors de l'upload du fichier:", error);
    throw error;
  }
}

// --- CONTRÔLE DES DATES (Anti-double réservation) ---
async function isResidenceAvailable(residenceId, checkIn, checkOut) {
  const newStart = new Date(checkIn);
  const newEnd = new Date(checkOut);

  const bookingsRef = db.collection('bookings');
  const snapshot = await bookingsRef
    .where('residenceId', '==', residenceId)
    .where('status', '==', 'confirmed')
    .get();

  for (let doc of snapshot.docs) {
    const booking = doc.data();
    const existingStart = new Date(booking.checkIn);
    const existingEnd = new Date(booking.checkOut);

    // Vérification du chevauchement des dates
    if (newStart < existingEnd && newEnd > existingStart) {
      return false; // Indisponible
    }
  }
  return true; // Disponible
}

// --- AFFICHAGE ET CHARGEMENT DE LA GALERIE ---
async function loadResidences(filters = {}) {
  const container = document.getElementById('listings-grid');
  container.innerHTML = '<p>Chargement des logements...</p>';

  let query = db.collection('residences').where('isApproved', '==', true);

  if (filters.city) {
    query = query.where('city', '==', filters.city);
  }
  if (filters.type) {
    query = query.where('type', '==', filters.type);
  }

  try {
    const snapshot = await query.get();
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = '<p>Aucun logement ne correspond à vos critères.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      if (filters.maxPrice && data.pricePerNight > Number(filters.maxPrice)) {
        return;
      }
      
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${data.images?.[0] || 'https://via.placeholder.com/300'}" class="card-img" alt="${data.title}">
        <div class="card-body">
          <h3>${data.title}</h3>
          <p><i class="fa-solid fa-location-dot"></i> ${data.city}</p>
          <p><strong>${data.pricePerNight.toLocaleString()} FCFA</strong> / nuit</p>
          <button class="btn-primary" onclick="initBookingProcess('${doc.id}', ${data.pricePerNight})">Réserver</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Erreur au chargement :", error);
  }
}

// --- LOGIQUE DE RÉSERVATION AVEC LIEN WHATSAPP ---
async function initBookingProcess(residenceId, pricePerNight) {
  const checkIn = prompt("Date d'arrivée (AAAA-MM-JJ) :");
  const checkOut = prompt("Date de départ (AAAA-MM-JJ) :");

  if (!checkIn || !checkOut) return;

  const available = await isResidenceAvailable(residenceId, checkIn, checkOut);
  if (!available) {
    alert("Désolé, cette résidence est déjà réservée pour ces dates.");
    return;
  }

  // Calcul du coût
  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  const totalPrice = nights * pricePerNight;
  const deposit = totalPrice * 0.3; // Acompte de 30%

  if (confirm(`Total : ${totalPrice.toLocaleString()} FCFA (${nights} nuits).\nAcompte à payer : ${deposit.toLocaleString()} FCFA.\nConfirmer la réservation ?`)) {
    const bookingRef = await db.collection('bookings').add({
      residenceId,
      checkIn,
      checkOut,
      totalPrice,
      depositPaid: deposit,
      status: 'confirmed',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Redirection WhatsApp pour envoi direct du reçu
    const phonePropriétaire = "225000000000"; // Numéro à récupérer dynamiquement
    const message = encodeURIComponent(`Bonjour, je confirme ma réservation #${bookingRef.id} du ${checkIn} au ${checkOut}. Acompte versé : ${deposit} FCFA.`);
    window.open(`https://wa.me/${phonePropriétaire}?text=${message}`, '_blank');
  }
}

// --- AUTHENTIFICATION SÉCURISÉE ---
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    alert("Connexion réussie !");
    document.getElementById('modal-auth').style.display = 'none';
  } catch (error) {
    alert("Erreur de connexion : " + error.message);
  }
});

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  loadResidences();
  
  // Événement recherche
  document.getElementById('btn-apply-filters').addEventListener('click', () => {
    loadResidences({
      city: document.getElementById('filter-city').value,
      type: document.getElementById('filter-type').value,
      maxPrice: document.getElementById('filter-max-price').value
    });
  });
});