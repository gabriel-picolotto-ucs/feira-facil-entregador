/* ==================== ESTADO DO MOTOBOY ==================== */
let isOnline = false;
let offerTimerInterval = null;
let currentOfferTimeout = null;
let offerCountdown = 15;
let activeDelivery = null;

let todayEarnings = 0.00;
let todayDeliveriesCount = 0;

let currentOfferData = null;
let preparationTimeouts = [];

/* CONTADOR DE NOTIFICAÇÕES NÃO LIDAS */
let unreadNotificationsCount = 0;

/* DADOS DO PERFIL DO ENTREGADOR */
let driverProfileData = {
    name: 'Carlos Silva',
    email: 'carlos.entregas@email.com',
    phone: '(54) 98888-7777',
    vehicle: 'Honda CG 160 • ABC-1D23'
};

/* HISTÓRICO DE ENTREGAS REALIZADAS */
let completedDeliveries = [
    {
        id: '#9785',
        time: 'Ontem às 11:30',
        price: 14.50,
        distance: '4.1 km',
        pickupSummary: 'Feira Agroecológica do Canteiro',
        dropoff: 'Rua Dom Pedro I, 88 - Centro'
    }
];

/* BANCO DE DADOS SIMULADO DE OFERTAS DE ENTREGA */
const possibleOffersPool = [
    {
        id: '#9802',
        price: 18.90,
        distance: '6.8 km',
        clientName: 'Roberto Souza',
        dropoff: 'Av. Brasil, 890 - Jardim América',
        confirmCode: '1234',
        pickups: [
            {
                fairName: 'Feira Orgânica do Bairro',
                address: 'Av. das Flores, 1200',
                stallName: 'Tenda Legumes do Sítio',
                isReady: false,
                items: [
                    { id: 'item_6', name: 'Tomate Italiano Orgânico (2kg)', checked: false },
                    { id: 'item_7', name: 'Cenoura Orgânica (1kg)', checked: false }
                ]
            },
            {
                fairName: 'Feira Livre São José',
                address: 'Rua Dom Pedro II',
                stallName: 'Padaria Artesanal Seu João',
                isReady: false,
                items: [
                    { id: 'item_8', name: 'Pão de Milho Caseiro (1 un)', checked: false }
                ]
            }
        ]
    },
    {
        id: '#9804',
        price: 22.00,
        distance: '8.4 km',
        clientName: 'Lucas Ferreira',
        dropoff: 'Rua Guaranis, 310 - Alto da Boa Vista',
        confirmCode: '1234',
        pickups: [
            {
                fairName: 'Feira das Artes & Sabores',
                address: 'Parque das Águas',
                stallName: 'Tenda Peixaria Beira-Mar',
                isReady: false,
                items: [
                    { id: 'item_1', name: 'Filé de Tilápia Fresco (1kg)', checked: false }
                ]
            },
            {
                fairName: 'Feira das Artes & Sabores',
                address: 'Parque das Águas',
                stallName: 'Tenda Das Bebidas e Polpas',
                isReady: false,
                items: [
                    { id: 'item_2', name: 'Suco de Laranja Integral (1L)', checked: false }
                ]
            }
        ]
    }
];

// LISTA INICIAL DE NOTIFICAÇÕES (INICIA VAZIA)
let driverNotifications = [];

/* ==================== INICIALIZAÇÃO DA NAVEGAÇÃO ==================== */
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const screens = document.querySelectorAll('.screen');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetScreenId = item.getAttribute('data-target');
            if (!targetScreenId) return;

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            screens.forEach(screen => {
                screen.id === targetScreenId ? screen.classList.add('active') : screen.classList.remove('active');
            });
        });
    });

    renderCompletedDeliveriesUI();
    renderActiveDeliveryUI();
    updateNotificationBadge();
});

/* ==================== PERFIL DO ENTREGADOR ==================== */
function openProfileScreen() {
    document.getElementById('driver-name-input').value = driverProfileData.name;
    document.getElementById('driver-email-input').value = driverProfileData.email;
    document.getElementById('driver-phone-input').value = driverProfileData.phone;
    document.getElementById('driver-vehicle-input').value = driverProfileData.vehicle;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('profile-screen').classList.add('active');
}

function closeProfileScreen() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('home-screen').classList.add('active');

    document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector('.bottom-nav [data-target="home-screen"]').classList.add('active');
}

function saveDriverProfile(event) {
    event.preventDefault();
    driverProfileData.name = document.getElementById('driver-name-input').value;
    driverProfileData.email = document.getElementById('driver-email-input').value;
    driverProfileData.phone = document.getElementById('driver-phone-input').value;
    driverProfileData.vehicle = document.getElementById('driver-vehicle-input').value;

    const firstName = driverProfileData.name.split(' ')[0];
    document.getElementById('header-user-name').textContent = `Olá, ${firstName}!`;
    document.getElementById('profile-display-name').textContent = driverProfileData.name;
    document.getElementById('profile-display-email').textContent = driverProfileData.email;

    showToast("Perfil atualizado com sucesso!");
}

/* ==================== STATUS ONLINE / OFFLINE ==================== */
function toggleDriverStatus(toggleElement) {
    isOnline = toggleElement.checked;

    const statusCard = document.getElementById('status-card');
    const statusDot = document.getElementById('status-dot');
    const statusTitle = document.getElementById('status-title');
    const statusDesc = document.getElementById('status-desc');

    if (isOnline) {
        statusCard.classList.add('online');
        statusDot.classList.add('active');
        statusTitle.textContent = 'Você está Online!';
        statusDesc.textContent = 'Procurando as melhores ofertas de entrega para você...';

        showToast("Você está ONLINE. Aguarde chamadas!");
        scheduleNextOfferSimulation(3000);
    } else {
        statusCard.classList.remove('online');
        statusDot.classList.remove('active');
        statusTitle.textContent = 'Você está Offline';
        statusDesc.textContent = 'Fique online para receber ofertas de entregas na sua região.';

        clearScheduledOffers();
        closeOfferModal();
        showToast("Você ficou OFFLINE.");
    }
}

/* ==================== SIMULADOR DE OFERTAS ==================== */
function scheduleNextOfferSimulation(delayMs = 8000) {
    if (!isOnline || activeDelivery) return;

    clearScheduledOffers();
    currentOfferTimeout = setTimeout(() => {
        if (isOnline && !activeDelivery) {
            triggerDeliveryOffer();
        }
    }, delayMs);
}

function clearScheduledOffers() {
    if (currentOfferTimeout) {
        clearTimeout(currentOfferTimeout);
        currentOfferTimeout = null;
    }
}

function triggerDeliveryOffer() {
    const randomIndex = Math.floor(Math.random() * possibleOffersPool.length);
    currentOfferData = JSON.parse(JSON.stringify(possibleOffersPool[randomIndex]));

    document.getElementById('offer-price-val').textContent = `R$ ${currentOfferData.price.toFixed(2).replace('.', ',')}`;
    document.getElementById('offer-distance-val').textContent = currentOfferData.distance;

    const fairSummary = currentOfferData.pickups.map(p => p.fairName).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    document.getElementById('offer-pickup-val').textContent = fairSummary;
    document.getElementById('offer-dropoff-val').textContent = currentOfferData.dropoff;

    offerCountdown = 15;
    const timerDisplay = document.getElementById('timer-display');
    timerDisplay.textContent = offerCountdown;

    document.getElementById('delivery-offer-modal').classList.remove('hidden');

    if (offerTimerInterval) clearInterval(offerTimerInterval);

    offerTimerInterval = setInterval(() => {
        offerCountdown--;
        timerDisplay.textContent = offerCountdown;

        if (offerCountdown <= 0) {
            clearInterval(offerTimerInterval);
            rejectDeliveryOffer(true);
        }
    }, 1000);
}

function closeOfferModal() {
    if (offerTimerInterval) clearInterval(offerTimerInterval);
    document.getElementById('delivery-offer-modal').classList.add('hidden');
}

function acceptDeliveryOffer() {
    closeOfferModal();
    activeDelivery = { ...currentOfferData, status: 'Aguardando Preparação' };

    showToast(`Entrega ${activeDelivery.id} Aceita! Aguardando tendas.`);
    renderActiveDeliveryUI();

    simulateStallPreparationNotifications();
}

function rejectDeliveryOffer(expired = false) {
    closeOfferModal();
    currentOfferData = null;

    if (expired) {
        showToast("A oferta expirou e foi repassada a outro motoboy.");
    } else {
        showToast("Oferta recusada.");
    }

    if (isOnline) {
        scheduleNextOfferSimulation(7000);
    }
}

/* ==================== SISTEMA DE NOTIFICAÇÃO DE SEPARAÇÃO DAS TENDAS ==================== */
function simulateStallPreparationNotifications() {
    preparationTimeouts.forEach(t => clearTimeout(t));
    preparationTimeouts = [];

    if (!activeDelivery || !activeDelivery.pickups) return;

    activeDelivery.pickups.forEach((pickup, index) => {
        const delay = (index + 1) * 4000;

        const timeoutId = setTimeout(() => {
            if (activeDelivery && activeDelivery.pickups[index]) {
                activeDelivery.pickups[index].isReady = true;

                const allReady = activeDelivery.pickups.every(p => p.isReady);
                if (allReady) {
                    activeDelivery.status = 'Pronto para Retirada';
                }

                const notifyMsg = `A ${pickup.stallName} já separou seu pedido!`;
                showToast(notifyMsg);

                driverNotifications.unshift({
                    id: Date.now(),
                    title: 'Pedido Separado!',
                    time: 'Agora',
                    desc: notifyMsg,
                    icon: 'fa-box-open',
                    color: '#2e7d32'
                });

                // INCREMENTA APENAS AS NÃO LIDAS
                unreadNotificationsCount += 1;
                updateNotificationBadge();
                renderActiveDeliveryUI();
            }
        }, delay);

        preparationTimeouts.push(timeoutId);
    });
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (unreadNotificationsCount <= 0) {
            badge.classList.add('hidden');
        } else {
            badge.textContent = unreadNotificationsCount;
            badge.classList.remove('hidden');
        }
    }
}

/* ==================== FLUXO DE CHECKLIST E INTERFACE DA ENTREGA ==================== */
function renderActiveDeliveryUI() {
    const container = document.getElementById('active-delivery-container');
    const summarySection = document.getElementById('today-summary-section');

    if (!activeDelivery) {
        if (summarySection) {
            summarySection.style.display = 'block';
            summarySection.classList.remove('hidden');
        }

        container.innerHTML = `
            <div class="empty-list" style="padding: 30px 0;">
                <i class="fas fa-motorcycle"></i>
                <p>Nenhuma entrega em andamento no momento.</p>
            </div>
        `;
        return;
    }

    if (summarySection) {
        summarySection.style.display = 'none';
        summarySection.classList.add('hidden');
    }

    let allItemsChecked = true;
    activeDelivery.pickups.forEach(p => {
        p.items.forEach(item => {
            if (!item.checked) allItemsChecked = false;
        });
    });

    let actionButtonHTML = '';
    if (activeDelivery.status !== 'Em Trânsito') {
        const disabledAttr = allItemsChecked ? '' : 'disabled style="opacity: 0.5; cursor: not-allowed; background-color: #757575;"';
        actionButtonHTML = `<button class="btn-checkout" ${disabledAttr} onclick="markAsPickedUp()">Pedido Retirado</button>`;
    } else {
        actionButtonHTML = `<button class="btn-checkout" onclick="openConfirmCodeModal()">Concluir Entrega</button>`;
    }

    const groupedByFair = {};
    activeDelivery.pickups.forEach((p, pIndex) => {
        if (!groupedByFair[p.fairName]) {
            groupedByFair[p.fairName] = {
                address: p.address,
                stalls: []
            };
        }
        groupedByFair[p.fairName].stalls.push({ ...p, originalIndex: pIndex });
    });

    let pickupsHTML = '';
    Object.keys(groupedByFair).forEach(fairName => {
        const fairData = groupedByFair[fairName];

        pickupsHTML += `
            <div class="fair-group-block" style="margin-top: 12px; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 6px; background: #e8f5e9; padding: 6px 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #c8e6c9;">
                    <i class="fas fa-map-marker-alt" style="color: #2e7d32; font-size: 14px;"></i>
                    <div>
                        <strong style="font-size: 13px; color: #2e7d32; display: block; line-height: 1.1;">${fairName}</strong>
                        <small style="font-size: 11px; color: #555;">${fairData.address}</small>
                    </div>
                </div>

                ${fairData.stalls.map(p => `
                    <div style="background: ${p.isReady ? '#ffffff' : '#fafafa'}; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; border-left: 3px solid ${p.isReady ? '#2e7d32' : '#ff9800'}; border: 1px solid #eee;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <p style="font-size: 13px; font-weight: 600; color: #2e7d32;">
                                <i class="fas fa-store"></i> ${p.stallName}
                            </p>
                            <span style="font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: ${p.isReady ? '#e8f5e9' : '#fff3e0'}; color: ${p.isReady ? '#2e7d32' : '#e65100'};">
                                ${p.isReady ? '<i class="fas fa-check-circle"></i> Pedido Pronto' : '<i class="fas fa-spinner fa-spin"></i> Separando...'}
                            </span>
                        </div>

                        <div class="checklist-items">
                            ${p.items.map((item, itemIndex) => `
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: ${p.isReady ? '#333' : '#aaa'}; margin-bottom: 6px; cursor: ${p.isReady ? 'pointer' : 'not-allowed'};">
                                    <input type="checkbox" ${item.checked ? 'checked' : ''} ${p.isReady ? '' : 'disabled'}
                                           onchange="toggleItemCheck(${p.originalIndex}, ${itemIndex}, this.checked)"
                                           style="accent-color: #2e7d32; width: 16px; height: 16px;">
                                    <span style="${item.checked ? 'text-decoration: line-through; color: #888;' : ''}">${item.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });

    container.innerHTML = `
        <div class="order-card" style="margin: 0;">
            <div class="order-card-header">
                <div>
                    <span class="order-id">${activeDelivery.id}</span>
                    <div class="order-date">${activeDelivery.distance}</div>
                </div>
                <span class="order-status-badge badge-prep"><i class="fas fa-spinner fa-spin"></i> ${activeDelivery.status}</span>
            </div>

            <div class="order-items-preview">
                <div>
                    <span style="font-size: 12px; font-weight: 600; color: #555; display: block;">
                        <i class="fas fa-boxes" style="color: #2e7d32;"></i> Status de Separação por Tenda:
                    </span>
                    ${pickupsHTML}
                </div>

                <hr style="border:none; border-top: 1px dashed #e0e0e0; margin: 10px 0;">

                <p style="margin-bottom: 4px;"><i class="fas fa-map-marker-alt" style="color:#e65100; margin-right:6px;"></i><strong>Entrega:</strong> ${activeDelivery.clientName}</p>
                <small style="color:#666; display:block; margin-left:20px;">${activeDelivery.dropoff}</small>
            </div>

            <div class="order-card-footer" style="flex-direction: column; gap: 10px; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; color: #666;">Ganho da corrida:</span>
                    <span class="order-total-price">R$ ${activeDelivery.price.toFixed(2).replace('.', ',')}</span>
                </div>
                ${actionButtonHTML}
            </div>
        </div>
    `;
}

/* MARCAR/DESMARCAR ITEM DO CHECKLIST */
function toggleItemCheck(pickupIndex, itemIndex, isChecked) {
    if (!activeDelivery) return;
    activeDelivery.pickups[pickupIndex].items[itemIndex].checked = isChecked;
    renderActiveDeliveryUI();
}

function markAsPickedUp() {
    if (!activeDelivery) return;
    activeDelivery.status = 'Em Trânsito';
    showToast("Pedido retirado! Siga para o endereço do cliente.");
    renderActiveDeliveryUI();
}

function openConfirmCodeModal() {
    document.getElementById('client-code-input').value = '';
    document.getElementById('confirm-code-modal').classList.remove('hidden');
}

function closeConfirmCodeModal() {
    document.getElementById('confirm-code-modal').classList.add('hidden');
}

function submitConfirmationCode(event) {
    event.preventDefault();
    const inputCode = document.getElementById('client-code-input').value.trim();

    if (!activeDelivery) return;

    if (inputCode === activeDelivery.confirmCode) {
        closeConfirmCodeModal();
        completeDelivery();
    } else {
        showToast("Código incorreto! Tente novamente.");
    }
}

function completeDelivery() {
    if (!activeDelivery) return;

    todayEarnings += activeDelivery.price;
    todayDeliveriesCount += 1;

    const fairSummary = activeDelivery.pickups.map(p => p.fairName).filter((v, i, a) => a.indexOf(v) === i).join(', ');

    completedDeliveries.unshift({
        id: activeDelivery.id,
        time: 'Hoje às ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: activeDelivery.price,
        distance: activeDelivery.distance,
        pickupSummary: fairSummary,
        dropoff: activeDelivery.dropoff
    });

    document.getElementById('today-earnings').textContent = `R$ ${todayEarnings.toFixed(2).replace('.', ',')}`;
    document.getElementById('today-deliveries').textContent = todayDeliveriesCount;

    showToast(`Entrega ${activeDelivery.id} concluída com sucesso! +R$ ${activeDelivery.price.toFixed(2).replace('.', ',')}`);

    activeDelivery = null;
    renderActiveDeliveryUI();
    renderCompletedDeliveriesUI();

    if (isOnline) {
        scheduleNextOfferSimulation(10000);
    }
}

function renderCompletedDeliveriesUI() {
    const container = document.getElementById('completed-deliveries-container');
    if (!container) return;

    if (completedDeliveries.length === 0) {
        container.innerHTML = `
            <div class="empty-list" style="padding: 40px 0;">
                <i class="fas fa-history"></i>
                <p>Nenhuma entrega concluída ainda.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = completedDeliveries.map(item => `
        <div class="order-card">
            <div class="order-card-header">
                <div>
                    <span class="order-id">${item.id}</span>
                    <div class="order-date">${item.time} • ${item.distance}</div>
                </div>
                <span class="order-status-badge badge-done"><i class="fas fa-check-circle"></i> Entregue</span>
            </div>

            <div class="order-items-preview">
                <p><i class="fas fa-store" style="color:#2e7d32;"></i> ${item.pickupSummary}</p>
                <p><i class="fas fa-map-marker-alt" style="color:#e65100;"></i> ${item.dropoff}</p>
            </div>

            <div class="order-card-footer">
                <span>Ganho</span>
                <span class="order-total-price">R$ ${item.price.toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
    `).join('');
}

/* ==================== NOTIFICAÇÕES & TOAST ==================== */
function toggleNotificationsModal() {
    const modal = document.getElementById('notifications-modal');

    if (modal.classList.contains('hidden')) {
        renderNotificationsUI();
        modal.classList.remove('hidden');

        // ZERA O CONTADOR E OCULTA O BADGE AO ABRIR O MODAL
        unreadNotificationsCount = 0;
        updateNotificationBadge();
    } else {
        modal.classList.add('hidden');
    }
}

function closeNotificationsModalOnOutside(e) {
    if (e.target.id === 'notifications-modal') {
        document.getElementById('notifications-modal').classList.add('hidden');
    }
}

function renderNotificationsUI() {
    const container = document.getElementById('notifications-list');

    if (driverNotifications.length === 0) {
        container.innerHTML = `
            <div class="empty-list" style="padding: 30px 0;">
                <i class="fas fa-bell-slash"></i>
                <p>Nenhuma notificação no momento.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = driverNotifications.map(n => `
        <div class="notification-item">
            <div class="notification-icon" style="background-color: ${n.color}15; color: ${n.color};">
                <i class="fas ${n.icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-header-row">
                    <strong>${n.title}</strong>
                    <span class="notification-time">${n.time}</span>
                </div>
                <p>${n.desc}</p>
            </div>
        </div>
    `).join('');
}

function showToast(message) {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');

    if (toast && toastMsg) {
        toastMsg.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}