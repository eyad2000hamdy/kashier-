// بيانات أولية افتراضية للعطارة والبقالة
const defaultCategories = ["بهارات وتوابل", "حبوب وبقوليات", "زيوت وسمن", "معلبات ومشروبات"];
const defaultProducts = [
    { id: 1, name: "كمون مطحون (كجم)", category: "بهارات وتوابل", price: 160, stock: 15, minStock: 3, prodDate: "2026-01-01", expiryDate: "2027-01-01" },
    { id: 2, name: "فلفل أسود حب (كجم)", category: "بهارات وتوابل", price: 220, stock: 2, minStock: 5, prodDate: "2026-02-01", expiryDate: "2027-02-01" },
    { id: 3, name: "أرز مصري (كجم)", category: "حبوب وبقوليات", price: 30, stock: 50, minStock: 10, prodDate: "2026-03-01", expiryDate: "2026-12-01" },
    { id: 4, name: "عدس أصفر (كجم)", category: "حبوب وبقوليات", price: 50, stock: 4, minStock: 5, prodDate: "2026-02-15", expiryDate: "2027-02-15" },
    { id: 5, name: "زيت ذرة (لتر)", category: "زيوت وسمن", price: 65, stock: 12, minStock: 4, prodDate: "2026-01-10", expiryDate: "2028-01-10" }
];

let categories = JSON.parse(localStorage.getItem('restaurant_categories')) || defaultCategories;
let products = JSON.parse(localStorage.getItem('restaurant_products')) || defaultProducts;
let orders = JSON.parse(localStorage.getItem('restaurant_orders')) || [];
let suppliers = JSON.parse(localStorage.getItem('restaurant_suppliers')) || [];
let currentCart = [];
let selectedCategory = "الكل";

const todayStr = new Date().toISOString().split('T')[0];
document.getElementById('filterDate').value = todayStr;
document.getElementById('reportDate').value = todayStr;

// التنقل بين التبويبات
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        
        e.target.classList.add('active');
        const tabId = e.target.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        if (tabId === 'cashier') renderCashier();
        if (tabId === 'products') renderProductsManagement();
        if (tabId === 'orders') searchOrders();
        if (tabId === 'reports') generateReport();
        if (tabId === 'suppliers') renderSuppliersManagement();
    });
});

// --- شاشة الكاشير والمخزون ---
function renderCashier() {
    checkLowStockWarnings();
    renderCategoriesBar();
    renderProductsGrid();
    renderCart();
    updateCategoryDropdowns();
}

function checkLowStockWarnings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // ضبط الوقت بداية اليوم

    let warnings = [];

    products.forEach(p => {
        // 1. فحص نقص المخزون
        if (p.stock <= p.minStock) {
            warnings.push(`📦 <strong>${p.name}</strong> (قارب المخزون على النفاذ: متبقي ${p.stock})`);
        }

        // 2. فحص قرب انتهاء الصلاحية (قبلها بـ 7 أيام)
        if (p.expiryDate) {
            const expDate = new Date(p.expiryDate);
            expDate.setHours(0, 0, 0, 0);

            // حساب الفرق بالأيام
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                warnings.push(`⚠️ <strong>${p.name}</strong> (انتهت صلاحيته بالفعل بتاريخ ${p.expiryDate})`);
            } else if (diffDays <= 7) {
                warnings.push(`⏳ <strong>${p.name}</strong> (اقترب تاريخ نهاية صلاحيته: متبقي ${diffDays} أيام - ينتهي في ${p.expiryDate})`);
            }
        }
    });

    const banner = document.getElementById('lowStockAlertBanner');
    if (warnings.length > 0) {
        banner.style.display = 'block';
        banner.innerHTML = `<strong>تنبيهات النظام:</strong><br>` + warnings.join('<br>');
    } else {
        banner.style.display = 'none';
    }
}

function renderCategoriesBar() {
    const bar = document.getElementById('categoriesBar');
    let html = `<button class="cat-btn ${selectedCategory === 'الكل' ? 'active' : ''}" onclick="filterCategory('الكل')">الكل</button>`;
    categories.forEach(cat => {
        html += `<button class="cat-btn ${selectedCategory === cat ? 'active' : ''}" onclick="filterCategory('${cat}')">${cat}</button>`;
    });
    bar.innerHTML = html;
}

window.filterCategory = function(cat) {
    selectedCategory = cat;
    renderCategoriesBar();
    renderProductsGrid();
}

function renderProductsGrid() {
    const grid = document.getElementById('productsGrid');
    const filtered = selectedCategory === 'الكل' ? products : products.filter(p => p.category === selectedCategory);
    
    let html = '';
    filtered.forEach(p => {
        const isLow = p.stock <= p.minStock;
        html += `
            <div class="product-card" onclick="addToCart(${p.id})">
                <h4>${p.name}</h4>
                <div class="price">${p.price} ج.م</div>
                <div class="stock-info ${isLow ? 'low-stock' : ''}">مخزون: ${p.stock}</div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

window.addToCart = function(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (prod.stock <= 0) {
        alert("عذراً، هذا المنتج نفد من المخزون!");
        return;
    }

    const existing = currentCart.find(item => item.id === productId);
    if (existing) {
        if (existing.qty >= prod.stock) {
            alert("الكمية المطلوبة تتجاوز المتاح في المخزون!");
            return;
        }
        existing.qty++;
    } else {
        currentCart.push({
            id: prod.id,
            name: prod.name,
            price: prod.price,
            qty: 1
        });
    }
    renderCart();
}

function renderCart() {
    const tbody = document.getElementById('cartTableBody');
    let html = '';
    let subtotal = 0;

    currentCart.forEach((item, index) => {
        const itemTotal = item.qty * item.price;
        subtotal += itemTotal;
        html += `
            <tr>
                <td>${item.name}</td>
                <td>
                    <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    ${item.qty}
                    <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </td>
                <td>${item.price}</td>
                <td>${itemTotal}</td>
                <td><button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="removeFromCart(${index})">حذف</button></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    
    document.getElementById('subTotal').innerText = subtotal.toFixed(2) + " ج.م";
    
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    let finalTotal = subtotal - discount;
    if (finalTotal < 0) finalTotal = 0;
    
    document.getElementById('cartTotal').innerText = finalTotal.toFixed(2) + " ج.م";
}

document.getElementById('discountInput').addEventListener('input', renderCart);

window.changeQty = function(index, delta) {
    const item = currentCart[index];
    const prod = products.find(p => p.id === item.id);
    
    const newQty = item.qty + delta;
    if (newQty > prod.stock) {
        alert("لا يمكن تجاوز الكمية المتاحة في المخزون!");
        return;
    }

    item.qty = newQty;
    if (item.qty <= 0) {
        currentCart.splice(index, 1);
    }
    renderCart();
}

window.removeFromCart = function(index) {
    currentCart.splice(index, 1);
    renderCart();
}

document.getElementById('clearCartBtn').addEventListener('click', () => {
    currentCart = [];
    document.getElementById('discountInput').value = 0;
    renderCart();
});

// --- إنشاء الأوردر وخصم المخزون والطباعة ---
document.getElementById('checkoutPrintBtn').addEventListener('click', () => {
    if (currentCart.length === 0) {
        alert("لا يمكن إنشاء أوردر فارغ!");
        return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    
    let counters = JSON.parse(localStorage.getItem('restaurant_counters')) || {};
    if (!counters[dateStr]) {
        counters[dateStr] = 1;
    } else {
        counters[dateStr]++;
    }
    const orderNum = counters[dateStr];
    localStorage.setItem('restaurant_counters', JSON.stringify(counters));

    let subtotal = currentCart.reduce((sum, item) => sum + (item.qty * item.price), 0);
    let discount = parseFloat(document.getElementById('discountInput').value) || 0;
    if (discount > subtotal) discount = subtotal;
    const finalTotal = subtotal - discount;

    // خصم الكميات من المخزون الأساسي
    currentCart.forEach(cartItem => {
        const prod = products.find(p => p.id === cartItem.id);
        if (prod) {
            prod.stock -= cartItem.qty;
            if (prod.stock < 0) prod.stock = 0;
        }
    });
    localStorage.setItem('restaurant_products', JSON.stringify(products));

    const newOrder = {
        id: `${dateStr}-${orderNum}`,
        orderNumber: orderNum,
        date: dateStr,
        time: timeStr,
        items: JSON.parse(JSON.stringify(currentCart)),
        subtotal: subtotal,
        discount: discount,
        total: finalTotal
    };

    orders.push(newOrder);
    localStorage.setItem('restaurant_orders', JSON.stringify(orders));

    // إعداد البون للطباعة
    document.getElementById('pReceiptNum').innerText = String(orderNum).padStart(3, '0');
    document.getElementById('pReceiptDate').innerText = dateStr;
    document.getElementById('pReceiptTime').innerText = timeStr;
    document.getElementById('pReceiptSubTotal').innerText = subtotal.toFixed(2);
    document.getElementById('pReceiptDiscount').innerText = discount.toFixed(2);
    document.getElementById('pReceiptTotal').innerText = finalTotal.toFixed(2);

    let receiptItemsHtml = '';
    currentCart.forEach(item => {
        receiptItemsHtml += `
            <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${item.price}</td>
                <td>${item.qty * item.price}</td>
            </tr>
        `;
    });
    document.getElementById('pReceiptItems').innerHTML = receiptItemsHtml;

    window.print();

    currentCart = [];
    document.getElementById('discountInput').value = 0;
    renderCart();
    alert("تم إنشاء الأوردر وخصم المخزون بنجاح!");
});

// --- إدارة المنتجات والمخزون ---
function updateCategoryDropdowns() {
    const select = document.getElementById('prodCategory');
    let html = '';
    categories.forEach(cat => {
        html += `<option value="${cat}">${cat}</option>`;
    });
    select.innerHTML = html;
}

function renderProductsManagement() {
    updateCategoryDropdowns();
    renderCategoriesManagement();
    
    const tbody = document.getElementById('productsTableBody');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';
    products.forEach((p, index) => {
        const isLowStock = p.stock <= p.minStock;
        
        // حساب حالة الصلاحية
        let isExpiringSoon = false;
        let expStatusText = '';

        if (p.expiryDate) {
            const expDate = new Date(p.expiryDate);
            expDate.setHours(0, 0, 0, 0);
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                isExpiringSoon = true;
                expStatusText = '<span class="low-stock">(منتهي الصلاحية)</span>';
            } else if (diffDays <= 7) {
                isExpiringSoon = true;
                expStatusText = `<span class="low-stock">(متبقي ${diffDays} أيام)</span>`;
            }
        }

        html += `
            <tr style="${isExpiringSoon ? 'background-color: #fef2f2;' : ''}">
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>${p.price} ج.م</td>
                <td class="${isLowStock ? 'low-stock' : ''}">${p.stock}</td>
                <td style="font-size: 0.85rem;">
                    إنتاج: ${p.prodDate || '-'} <br>
                    انتهاء/توريد: ${p.expiryDate || '-'} ${expStatusText}
                </td>
                <td><button class="btn btn-danger" style="padding:5px 10px; font-size:0.9rem;" onclick="deleteProduct(${index})">حذف</button></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

document.getElementById('productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value);
    const minStock = parseInt(document.getElementById('prodMinStock').value);
    const prodDate = document.getElementById('prodDate').value;
    const expiryDate = document.getElementById('prodExpiry').value;

    if (!name || isNaN(price) || isNaN(stock)) return;

    const newProd = {
        id: Date.now(),
        name,
        category,
        price,
        stock,
        minStock,
        prodDate,
        expiryDate
    };

    products.push(newProd);
    localStorage.setItem('restaurant_products', JSON.stringify(products));
    document.getElementById('productForm').reset();
    renderProductsManagement();
    alert("تم إضافة المنتج والمخزون بنجاح!");
});

document.getElementById('categoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const catName = document.getElementById('catName').value.trim();
    if (catName && !categories.includes(catName)) {
        categories.push(catName);
        localStorage.setItem('restaurant_categories', JSON.stringify(categories));
        document.getElementById('catName').value = '';
        renderProductsManagement();
        alert("تم إضافة القسم بنجاح!");
    }
});

window.deleteProduct = function(index) {
    if (confirm("هل أنت متأكد من حذف هذا المنتج؟ لن يؤثر ذلك على الفواتير القديمة.")) {
        products.splice(index, 1);
        localStorage.setItem('restaurant_products', JSON.stringify(products));
        renderProductsManagement();
    }
}

// --- سجل الأوردرات ---
document.getElementById('searchOrdersBtn').addEventListener('click', searchOrders);

function searchOrders() {
    const selectedDate = document.getElementById('filterDate').value;
    const tbody = document.getElementById('ordersTableBody');
    const filteredOrders = orders.filter(o => o.date === selectedDate);

    let html = '';
    filteredOrders.forEach(order => {
        html += `
            <tr>
                <td>${String(order.orderNumber).padStart(3, '0')}</td>
                <td>${order.date}</td>
                <td>${order.time}</td>
                <td>${order.total.toFixed(2)} ج.م</td>
                <td><button class="btn btn-primary" style="padding:5px 10px;" onclick="viewOrderDetails('${order.id}')">التفاصيل</button></td>
                <td><button class="btn btn-secondary" style="padding:5px 10px;" onclick="reprintOrder('${order.id}')">إعادة طباعة</button></td>
                <td><button class="btn btn-danger" style="padding:5px 10px;" onclick="deleteOrder('${order.id}')">حذف</button></td>
            </tr>
        `;
    });
    tbody.innerHTML = html || `<tr><td colspan="7" style="text-align:center;">لا توجد أوردرات في هذا التاريخ</td></tr>`;
}

// نافذة التفاصيل
const modal = document.getElementById('orderModal');
document.querySelector('.close-modal').onclick = () => modal.style.display = "none";

window.viewOrderDetails = function(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('modalOrderNum').innerText = String(order.orderNumber).padStart(3, '0');
    document.getElementById('modalOrderDate').innerText = order.date;
    document.getElementById('modalOrderTime').innerText = order.time;
    document.getElementById('modalOrderSubTotal').innerText = (order.subtotal || order.total).toFixed(2);
    document.getElementById('modalOrderDiscount').innerText = (order.discount || 0).toFixed(2);
    document.getElementById('modalOrderTotal').innerText = order.total.toFixed(2);

    let html = '';
    order.items.forEach(item => {
        html += `
            <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${item.price} ج.م</td>
                <td>${(item.qty * item.price).toFixed(2)} ج.م</td>
            </tr>
        `;
    });
    document.getElementById('modalItemsBody').innerHTML = html;
    document.getElementById('modalPrintBtn').onclick = () => reprintOrder(order.id);

    modal.style.display = "block";
}

window.reprintOrder = function(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('pReceiptNum').innerText = String(order.orderNumber).padStart(3, '0');
    document.getElementById('pReceiptDate').innerText = order.date;
    document.getElementById('pReceiptTime').innerText = order.time;
    document.getElementById('pReceiptSubTotal').innerText = (order.subtotal || order.total).toFixed(2);
    document.getElementById('pReceiptDiscount').innerText = (order.discount || 0).toFixed(2);
    document.getElementById('pReceiptTotal').innerText = order.total.toFixed(2);

    let receiptItemsHtml = '';
    order.items.forEach(item => {
        receiptItemsHtml += `
            <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${item.price}</td>
                <td>${item.qty * item.price}</td>
            </tr>
        `;
    });
    document.getElementById('pReceiptItems').innerHTML = receiptItemsHtml;
    window.print();
}

window.deleteOrder = function(orderId) {
    if (confirm("هل أنت متأكد من حذف هذا الأوردر؟ سيتم إرجاع الكميات إلى المخزون وتحديث السجل والترقيم.")) {
        const index = orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            const orderToDelete = orders[index];
            
            // 1. إرجاع الكميات الخاصة بالأوردر إلى المخزون مرة أخرى
            orderToDelete.items.forEach(cartItem => {
                const prod = products.find(p => p.id === cartItem.id);
                if (prod) {
                    prod.stock += cartItem.qty; // إضافة الكمية للمخزون
                }
            });
            localStorage.setItem('restaurant_products', JSON.stringify(products));

            // 2. حذف الأوردر من قائمة الأوردرات
            orders.splice(index, 1);
            localStorage.setItem('restaurant_orders', JSON.stringify(orders));

            // 3. ضبط العداد اليومي (لتصحيح مشكلة الترقيم)
            let counters = JSON.parse(localStorage.getItem('restaurant_counters')) || {};
            const dateStr = orderToDelete.date;
            
            // البحث عن الأوردرات المتبقية في نفس اليوم
            const remainingOrdersForDate = orders.filter(o => o.date === dateStr);
            
            if (remainingOrdersForDate.length === 0) {
                // إذا لم يتبق أي أوردر في هذا اليوم، يتم مسح العداد ليعود الأوردر القادم رقم 1 تلقائياً
                delete counters[dateStr];
            } else {
                // إذا تبقيت أوردرات أخرى، اجعل العداد مساوياً لأكبر رقم أوردر موجود حالياً في ذلك اليوم
                const maxOrderNum = Math.max(...remainingOrdersForDate.map(o => o.orderNumber));
                counters[dateStr] = maxOrderNum;
            }
            localStorage.setItem('restaurant_counters', JSON.stringify(counters));

// 4. تحديث الشاشة والتقارير
            searchOrders();
            renderProductsManagement(); // لتحديث المخزون الظاهر في صفحة المنتجات فوراً
            alert("تم حذف الأوردر، وإرجاع الكميات للمخزون، وتحديث الترقيم بنجاح!");
        }
    }
}

// --- التقارير اليومية ---
document.getElementById('generateReportBtn').addEventListener('click', generateReport);

function generateReport() {
    const repDate = document.getElementById('reportDate').value;
    const dayOrders = orders.filter(o => o.date === repDate);

    let totalSales = 0;
    let itemSalesMap = {};

    dayOrders.forEach(order => {
        totalSales += order.total;
        order.items.forEach(item => {
            if (!itemSalesMap[item.name]) {
                itemSalesMap[item.name] = { qty: 0, total: 0 };
            }
            itemSalesMap[item.name].qty += item.qty;
            itemSalesMap[item.name].total += (item.qty * item.price);
        });
    });

    document.getElementById('repTotalOrders').innerText = dayOrders.length;
    document.getElementById('repTotalSales').innerText = totalSales.toFixed(2) + " ج.م";

    const tbody = document.getElementById('reportItemsBody');
    let html = '';
    for (let itemName in itemSalesMap) {
        html += `
            <tr>
                <td>${itemName}</td>
                <td>${itemSalesMap[itemName].qty}</td>
                <td>${itemSalesMap[itemName].total.toFixed(2)} ج.م</td>
            </tr>
        `;
    }
    tbody.innerHTML = html || `<tr><td colspan="3" style="text-align:center;">لا توجد مبيعات في هذا التاريخ</td></tr>`;
}

// --- النسخ الاحتياطي ---
document.getElementById('exportBtn').addEventListener('click', () => {
    const backupData = {
        categories,
        products,
        orders,
        suppliers, // أضف هذا السطر
        counters: JSON.parse(localStorage.getItem('restaurant_counters')) || {}
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `grocery_backup_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

document.getElementById('importBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('importFile');
    if (fileInput.files.length === 0) {
        alert("الرجاء اختيار ملف JSON أولاً!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.categories && data.products && data.orders) {
                if (confirm("هل أنت متأكد من استبدال البيانات الحالية بالبيانات المستوردة؟")) {
                    categories = data.categories;
                    products = data.products;
                    orders = data.orders;
                    suppliers = data.suppliers || []; // أضف هذا السطر
                    if (data.counters) {
                        localStorage.setItem('restaurant_counters', JSON.stringify(data.counters));
                    }
                    localStorage.setItem('restaurant_categories', JSON.stringify(categories));
                    localStorage.setItem('restaurant_products', JSON.stringify(products));
                    localStorage.setItem('restaurant_orders', JSON.stringify(orders));
                    alert("تم استعادة البيانات بنجاح!");
                    location.reload();
                }
            } else {
                alert("ملف النسخة الاحتياطية غير صالح!");
            }
        } catch (err) {
            alert("حدث خطأ أثناء قراءة الملف!");
        }
    };
    reader.readAsText(file);
});

// تشغيل الشاشة تلقائياً
renderCashier();
function renderCategoriesManagement() {
    const listContainer = document.getElementById('categoriesList');
    if (!listContainer) return;
    
    let html = '';
    categories.forEach((cat, index) => {
        html += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
                <span>${cat}</span>
                <button class="btn btn-danger" style="padding: 3px 8px; font-size: 0.8rem;" onclick="deleteCategory(${index})">حذف</button>
            </li>
        `;
    });
    listContainer.innerHTML = html || '<li>لا توجد أقسام</li>';
}

window.deleteCategory = function(index) {
    const catName = categories[index];
    
    // التحقق مما إذا كان القسم يحتوي على منتجات مرتبطة به
    const hasProducts = products.some(p => p.category === catName);
    if (hasProducts) {
        alert(`لا يمكن حذف القسم "${catName}" لأنه يحتوي على منتجات مرتبطة به! يجيب حذف المنتجات التابعة له أو نقلها أولاً.`);
        return;
    }

    if (confirm(`هل أنت متأكد من حذف القسم "${catName}"؟`)) {
        categories.splice(index, 1);
        localStorage.setItem('restaurant_categories', JSON.stringify(categories));
        renderProductsManagement();
        alert("تم حذف القسم بنجاح!");
    }
}
// تعيين تاريخ اليوم افتراضياً في نموذج الموردين
document.getElementById('suppDate').value = new Date().toISOString().split('T')[0];

document.getElementById('supplierForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('suppName').value.trim();
    const phone = document.getElementById('suppPhone').value.trim();
    const item = document.getElementById('suppItem').value.trim();
    const totalBill = parseFloat(document.getElementById('suppTotalBill').value) || 0;
    const paid = parseFloat(document.getElementById('suppPaid').value) || 0;
    const date = document.getElementById('suppDate').value;

    if (!name || !item) return;

    const remaining = totalBill - paid;

    const newSupplierRecord = {
        id: Date.now(),
        name,
        phone,
        item,
        totalBill,
        paid,
        remaining,
        date
    };

    suppliers.push(newSupplierRecord);
    localStorage.setItem('restaurant_suppliers', JSON.stringify(suppliers));
    
    document.getElementById('supplierForm').reset();
    document.getElementById('suppDate').value = new Date().toISOString().split('T')[0];
    renderSuppliersManagement();
    alert("تم تسجيل بيانات المورد والفاتورة بنجاح!");
});

function renderSuppliersManagement() {
    const tbody = document.getElementById('suppliersTableBody');
    let totalDebt = 0;
    let html = '';

    suppliers.forEach((s, index) => {
        totalDebt += s.remaining;
        html += `
            <tr>
                <td>${s.name}</td>
                <td>${s.phone || '-'}</td>
                <td>${s.item}</td>
                <td>${s.totalBill.toFixed(2)} ج.م</td>
                <td>${s.paid.toFixed(2)} ج.م</td>
                <td style="color: ${s.remaining > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: bold;">
                    ${s.remaining.toFixed(2)} ج.م
                </td>
                <td>${s.date}</td>
                <td>
                    <button class="btn btn-success" style="padding:4px 8px; font-size:0.8rem;" onclick="paySupplier(${index})">سداد</button>
                    <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="deleteSupplier(${index})">حذف</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html || `<tr><td colspan="8" style="text-align:center;">لا توجد سجلات للموردين</td></tr>`;
    document.getElementById('totalSuppliersDebt').innerText = totalDebt.toFixed(2);
}

// دالة سداد جزء أو كل المبلغ المتبقي للمورد
window.paySupplier = function(index) {
    const s = suppliers[index];
    const payAmountString = prompt(`المتبقي للمورد ${s.name} هو ${s.remaining} ج.م. أدخل المبلغ المراد سداده:`, s.remaining);
    
    if (payAmountString === null) return;
    const payAmount = parseFloat(payAmountString);

    if (isNaN(payAmount) || payAmount <= 0) {
        alert("الرجاء إدخال مبلغ صالح!");
        return;
    }

    if (payAmount > s.remaining) {
        alert("المبلغ المدفوع أكبر من المبلغ المتبقي!");
        return;
    }

    s.paid += payAmount;
    s.remaining -= payAmount;

    localStorage.setItem('restaurant_suppliers', JSON.stringify(suppliers));
    renderSuppliersManagement();
    alert(`تم تسجيل سداد مبلغ ${payAmount} ج.م للمورد بنجاح! المتبقي: ${s.remaining} ج.م`);
}

window.deleteSupplier = function(index) {
    if (confirm("هل أنت متأكد من حذف سجل هذا المورد؟")) {
        suppliers.splice(index, 1);
        localStorage.setItem('restaurant_suppliers', JSON.stringify(suppliers));
        renderSuppliersManagement();
    }
}