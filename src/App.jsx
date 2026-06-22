import React, { useState, useRef, useEffect } from 'react';
import { Package, CheckCircle, Truck, RotateCcw, X, Bell, Settings, Clock, User, RefreshCw, Plus, Minus } from 'lucide-react';

export default function BraunsteinKegRentalSystem() {
  // All state variables
  const [currentView, setCurrentView] = useState('main');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeModalConfig, setEmployeeModalConfig] = useState({ title: '', callback: null });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pickingQuantities, setPickingQuantities] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [signaturePaths, setSignaturePaths] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [returnOrder, setReturnOrder] = useState(null);
  const [emptyKegs, setEmptyKegs] = useState(0);
  const [fullKegs, setFullKegs] = useState(0);
  const [returnNotes, setReturnNotes] = useState('');
  const [drypbakkeReceived, setDrypbakkeReceived] = useState(false);
  const [isLoadingShopify, setIsLoadingShopify] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Orders now start EMPTY - they are loaded from the API on mount
  const [orders, setOrders] = useState([]);

  const generateInitialFacilities = () => {
    const list = [];
    for (let i = 1; i <= 50; i++) {
      const num = String(i).padStart(3, '0');
      list.push({
        id: `ANL-${num}`,
        name: `Anlæg ${num} - 2 haners anlæg`,
        status: 'active',
        lastService: '1.9.2025',
        lastCleaned: '10.9.2025',
        totalRentals: 0
      });
    }
    return list;
  };

  const [facilities, setFacilities] = useState(generateInitialFacilities());

  const employees = [
    { id: 'EMP001', name: 'Michael Poulsen' },
    { id: 'EMP002', name: 'Claus Braunstein' },
    { id: 'EMP003', name: 'Thomas Andersen' },
    { id: 'EMP004', name: 'Jimmy Jeppson' },
    { id: 'EMP005', name: 'Anders Bang' }
  ];

  const categories = [
    { id: 'nye', title: 'Nye Ordre', subtitle: 'Ventende ordrer', icon: Package, color: 'blue', status: 'pending' },
    { id: 'udlevering', title: 'Til Udlevering', subtitle: 'Klar til underskrift', icon: CheckCircle, color: 'green', status: 'packed' },
    { id: 'modtag_retur', title: 'Modtag Retur', subtitle: 'Registrer retur', icon: Truck, color: 'orange', status: 'shipped' },
    { id: 'forsinket', title: 'Forsinket', subtitle: 'Overskredet tid', icon: Clock, color: 'red', status: 'overdue' },
    { id: 'retur', title: 'Retur Ordre', subtitle: 'Returnerede', icon: RotateCcw, color: 'purple', status: 'returned' }
  ];

  // ===== LIVE ORDER FETCHING =====
  // Converts a Postgres order row (snake_case, from /api/orders) into the
  // shape this component expects (camelCase, matching the old mock data).
  const mapApiOrderToAppOrder = (row) => {
    const itemsFromDb = Array.isArray(row.items) ? row.items : [];
    const formatDate = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('da-DK');
    };

    return {
      id: String(row.shopify_id ?? row.id),
      orderNumber: row.order_number || `#${row.shopify_id ?? row.id}`,
      customer: row.customer_name || 'Guest',
      customerPhone: row.customer_phone || '',
      status: row.status || 'pending',
      priority: row.priority || 'normal',
      deliveryDate: formatDate(row.delivery_date),
      rentalStartDate: formatDate(row.created_at),
      rentalEndDate: formatDate(row.delivery_date),
      items: itemsFromDb.map((item, idx) => ({
        id: String(item.id ?? idx),
        name: item.name || item.sku || 'Vare',
        quantity: item.quantity ?? 1,
        picked: 0
      })),
      totalItems: itemsFromDb.reduce((sum, item) => sum + (item.quantity || 0), 0),
      notes: row.notes || '',
      customerSignature: null
    };
  };

  const loadOrdersFromApi = async () => {
    setIsLoadingShopify(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/orders?from=2026-01-01');
      if (!response.ok) {
        throw new Error(`API svarede med status ${response.status}`);
      }
      const data = await response.json();
      const rawOrders = data.orders || [];
      const mapped = rawOrders.map(mapApiOrderToAppOrder);
      setOrders(mapped);
    } catch (error) {
      console.error('Fejl ved hentning af ordre:', error);
      setLoadError(error.message);
    } finally {
      setIsLoadingShopify(false);
    }
  };

  // Load real orders once when the app first mounts
  useEffect(() => {
    loadOrdersFromApi();
  }, []);

  // Helper functions
  const getOrdersByStatus = (status) => {
    if (status === 'overdue') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return orders.filter(order => {
        if (order.status !== 'shipped') return false;
        const dateParts = (order.rentalEndDate || '').split('.');
        if (dateParts.length !== 3) return false;
        const endDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
        endDate.setHours(0, 0, 0, 0);
        return endDate < today;
      });
    }
    return orders.filter(order => order.status === status);
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700' },
      green: { bg: 'bg-green-50', text: 'text-green-600', button: 'bg-green-600 hover:bg-green-700' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', button: 'bg-orange-600 hover:bg-orange-700' },
      red: { bg: 'bg-red-50', text: 'text-red-600', button: 'bg-red-600 hover:bg-red-700' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', button: 'bg-purple-600 hover:bg-purple-700' }
    };
    return colors[color] || colors.blue;
  };

  const categoryStats = {
    'nye': getOrdersByStatus('pending').length,
    'udlevering': getOrdersByStatus('packed').length,
    'modtag_retur': getOrdersByStatus('shipped').length,
    'forsinket': getOrdersByStatus('overdue').length,
    'retur': getOrdersByStatus('returned').length
  };

  const getAvailableFacilities = () => {
    return facilities.filter(facility => facility.status === 'active');
  };

  // Navigation
  const navigateToMain = () => {
    setCurrentView('main');
    setSelectedCategory('');
    setShowFacilityDropdown(false);
    setShowSignatureModal(false);
    setShowReturnModal(false);
    setSelectedOrder(null);
    setSelectedFacilities([]);
    setSearchTerm('');
  };

  const navigateToCategory = (category) => {
    setSelectedCategory(category.id);
    setCurrentView('orders');
  };

  const navigateToAdmin = () => {
    setCurrentView('admin');
  };

  // Employee modal
  const openEmployeeModal = (title, callback) => {
    setEmployeeModalConfig({ title, callback });
    setShowEmployeeModal(true);
  };

  const selectEmployee = (employee) => {
    if (employeeModalConfig.callback) {
      employeeModalConfig.callback(employee);
    }
    setShowEmployeeModal(false);
    setEmployeeModalConfig({ title: '', callback: null });
  };

  // Order management
  const startOrderPicking = (order) => {
    setSelectedOrder(order);
    const initialQuantities = {};
    order.items.forEach(item => {
      initialQuantities[item.id] = item.picked || 0;
    });
    setPickingQuantities(initialQuantities);
    setSelectedFacilities([]);
    setShowFacilityDropdown(true);
  };

  const updatePickingQuantity = (itemId, quantity) => {
    setPickingQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, quantity)
    }));
  };

  const completeOrderPacking = (orderId, selectedFacilities) => {
    const packingNotes = window.prompt('Indtast evt. bemærkninger:') || '';
    
    openEmployeeModal('Vælg medarbejder', (employee) => {
      const currentDate = new Date();
      
      setFacilities(prev => prev.map(facility => {
        if (selectedFacilities.some(f => f.id === facility.id)) {
          return { ...facility, totalRentals: (facility.totalRentals || 0) + 1 };
        }
        return facility;
      }));
      
      setOrders(prev => prev.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            status: 'packed',
            packedBy: employee.name,
            packedDate: currentDate.toLocaleDateString('da-DK'),
            packedTime: currentDate.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }),
            assignedFacilities: selectedFacilities.map(f => f.id),
            packingNotes: packingNotes,
            items: order.items.map(item => ({
              ...item,
              picked: pickingQuantities[item.id] || item.picked || 0
            }))
          };
        }
        return order;
      }));

      alert(`Ordre ${selectedOrder.orderNumber} pakket af ${employee.name}!`);
      setSelectedOrder(null);
      setSelectedFacilities([]);
      setPickingQuantities({});
      navigateToMain();
    });
  };

  // Signature handling
  const startSignature = (order) => {
    setSelectedOrder(order);
    setCustomerName(order.customer);
    setSignaturePaths([]);
    setShowSignatureModal(true);
  };

  // Touch drawing
  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    let x, y;
    
    if (e.touches) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    setCurrentPath(`M${x},${y}`);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let x, y;
    
    if (e.touches) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    setCurrentPath(prev => `${prev} L${x},${y}`);
  };

  const stopDrawing = () => {
    if (isDrawing && currentPath) {
      setSignaturePaths(prev => [...prev, currentPath]);
      setCurrentPath('');
    }
    setIsDrawing(false);
  };

  // Return handling
  const handleReturnOrder = (order) => {
    setReturnOrder(order);
    setEmptyKegs(0);
    setFullKegs(0);
    setReturnNotes('');
    setDrypbakkeReceived(false);
    setShowReturnModal(true);
  };

  const completeReturn = () => {
    if (!returnOrder) return;
    
    const savedEmptyKegs = emptyKegs;
    const savedFullKegs = fullKegs;
    const savedReturnNotes = returnNotes;
    const savedDrypbakkeReceived = drypbakkeReceived;
    const savedReturnOrder = returnOrder;
    
    setShowReturnModal(false);
    
    setTimeout(() => {
      openEmployeeModal('Vælg medarbejder', (employee) => {
        setOrders(prevOrders =>
          prevOrders.map(o =>
            o.id === savedReturnOrder.id
              ? { 
                  ...o, 
                  status: 'returned',
                  returnedBy: employee.name,
                  emptyKegs: savedEmptyKegs,
                  fullKegs: savedFullKegs,
                  returnNotes: savedReturnNotes,
                  drypbakkeReceived: savedDrypbakkeReceived
                }
              : o
          )
        );
        
        setReturnOrder(null);
        setEmptyKegs(0);
        setFullKegs(0);
        setReturnNotes('');
        setDrypbakkeReceived(false);
        
        alert(`Retur registreret af ${employee.name}!`);
        navigateToMain();
      });
    }, 100);
  };

  // Admin functions
  const updateFacility = (facilityId, updates) => {
    setFacilities(prev => prev.map(facility => 
      facility.id === facilityId ? { ...facility, ...updates } : facility
    ));
  };

  const registerCleaning = (facility) => {
    const notes = window.prompt('Bemærkninger:') || 'Standard rensning';
    
    openEmployeeModal(`Registrer rensning`, (employee) => {
      const newDate = new Date().toLocaleDateString('da-DK');
      updateFacility(facility.id, {
        lastCleaned: newDate,
        lastCleanedBy: employee.name
      });
      alert(`Rensning registreret af ${employee.name}`);
    });
  };

  // Render order actions
  const renderOrderActions = (order) => {
    if (order.status === 'pending') {
      return (
        <button
          onClick={() => startOrderPicking(order)}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-semibold"
        >
          Start Plukning
        </button>
      );
    }

    if (order.status === 'packed') {
      return (
        <button
          onClick={() => startSignature(order)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl font-semibold"
        >
          Underskrift
        </button>
      );
    }

    if (order.status === 'shipped') {
      return (
        <button
          onClick={() => handleReturnOrder(order)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl font-semibold"
        >
          Registrer Retur
        </button>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* MAIN VIEW */}
      {currentView === 'main' && (
        <div className="pb-safe">
          <div className="bg-white shadow-sm border-b p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-r from-orange-400 to-orange-600 p-2 rounded-xl">
                  <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm">BK</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Braunstein Keg Rental</p>
                  <p className="font-semibold text-base">System v4.0.0</p>
                </div>
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-center mt-3 mb-1">Braunstein Keg Rental</h1>

            {loadError && (
              <div className="mx-2 mt-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2">
                Kunne ikke hente live ordre: {loadError}
              </div>
            )}
            
            {/* STATISTICS BAR */}
            <div className="mt-3 mx-2 bg-gradient-to-r from-blue-50 to-green-50 border border-gray-200 rounded-lg p-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-1.5 rounded">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Kommende</p>
                    <p className="text-lg font-bold text-blue-600">
                      {orders.filter(o => o.status !== 'returned').length}
                    </p>
                  </div>
                </div>
                
                <div className="w-px h-10 bg-gray-300"></div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 p-1.5 rounded">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Ledige</p>
                    <p className="text-lg font-bold text-green-600">
                      {facilities.filter(f => f.status === 'active').length}/{facilities.length}
                    </p>
                  </div>
                </div>
                
                <div className="w-px h-10 bg-gray-300"></div>
                
                <button 
                  onClick={loadOrdersFromApi}
                  disabled={isLoadingShopify}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingShopify ? 'animate-spin' : ''}`} />
                  <span className="ml-1">{isLoadingShopify ? 'Henter' : 'Opdater'}</span>
                </button>
              </div>
            </div>
            
            {/* SEARCH BAR */}
            <div className="mt-4 px-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Søg ordre nr. eller kunde..."
                  className="w-full px-4 py-3 pl-10 pr-10 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                />
                <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
              {categories.map((category) => {
                const IconComponent = category.icon;
                const colors = getColorClasses(category.color);
                const count = categoryStats[category.id];
                
                return (
                  <div
                    key={category.id}
                    onClick={() => navigateToCategory(category)}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-xl active:scale-95 transition-all"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`${colors.bg} p-3 rounded-full mb-3`}>
                        <IconComponent className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">{category.title}</h3>
                      <div className={`${colors.button} text-white px-3 py-1.5 rounded-full font-bold text-xs`}>
                        {count} ordre
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* ADMIN BUTTON */}
              <div
                onClick={() => navigateToAdmin()}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-xl active:scale-95 transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="bg-gray-50 p-3 rounded-full mb-3">
                    <Settings className="w-6 h-6 text-gray-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Admin</h3>
                  <div className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-full font-bold text-xs">
                    {facilities.length} anlæg
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDERS VIEW */}
      {currentView === 'orders' && (
        <div className="pb-safe">
          <div className="sticky top-0 bg-white shadow-sm border-b p-4 z-10">
            <button onClick={navigateToMain} className="text-blue-600 hover:text-blue-800 text-sm mb-2">
              ← Tilbage
            </button>
            <h1 className="text-lg font-bold">{categories.find(c => c.id === selectedCategory)?.title}</h1>
          </div>

          <div className="p-4 space-y-4">
            {getOrdersByStatus(categories.find(c => c.id === selectedCategory)?.status).map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-lg p-4 border-2">
                <div className="border-b border-gray-200 pb-3 mb-3">
                  <h2 className="text-lg font-bold">{order.orderNumber}</h2>
                  <h3 className="text-sm font-semibold text-gray-700">{order.customer}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {order.rentalStartDate} - {order.rentalEndDate}
                  </p>
                </div>

                <div className="mb-4">
                  <h4 className="font-bold text-sm mb-2">Ordre indhold:</h4>
                  {order.items && order.items.map((item) => (
                    <div key={item.id} className="flex justify-between p-2 bg-gray-50 rounded mb-1">
                      <span className="text-xs">{item.name}</span>
                      <span className="font-bold text-xs">{item.quantity} stk</span>
                    </div>
                  ))}
                </div>

                {renderOrderActions(order)}
              </div>
            ))}
            {getOrdersByStatus(categories.find(c => c.id === selectedCategory)?.status).length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">Ingen ordre i denne kategori.</p>
            )}
          </div>
        </div>
      )}

      {/* ADMIN VIEW */}
      {currentView === 'admin' && (
        <div className="pb-safe">
          <div className="sticky top-0 bg-white shadow-sm border-b p-4 z-10">
            <button onClick={navigateToMain} className="text-blue-600 hover:text-blue-800 text-sm mb-2">
              ← Tilbage
            </button>
            <h1 className="text-lg font-bold">Anlæg Administration</h1>
          </div>

          <div className="p-4 space-y-4">
            {facilities.map((facility) => (
              <div key={facility.id} className="bg-white rounded-xl shadow-lg p-4 border">
                <h3 className="text-base font-bold mb-3">{facility.name}</h3>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    facility.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {facility.status === 'active' ? 'AKTIV' : 'SERVICE'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    Udlejninger: {facility.totalRentals || 0}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-blue-50 border text-center">
                    <p className="text-xs font-bold text-blue-600">Service</p>
                    <p className="text-sm font-bold">{facility.lastService}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-50 border text-center">
                    <p className="text-xs font-bold text-green-600">Rensning</p>
                    <p className="text-sm font-bold">{facility.lastCleaned}</p>
                  </div>
                </div>

                <button 
                  onClick={() => registerCleaning(facility)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold text-xs"
                >
                  Registrer Rensning
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FACILITY DROPDOWN MODAL */}
      {selectedOrder && showFacilityDropdown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-blue-50">
              <h4 className="font-semibold text-blue-900">Pluk Ordre {selectedOrder.orderNumber}</h4>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <h5 className="font-semibold mb-3 text-sm">Pluk antal:</h5>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="text-sm truncate mr-2">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updatePickingQuantity(item.id, (pickingQuantities[item.id] || 0) - 1)}
                          className="bg-red-500 text-white w-8 h-8 rounded-full"
                        >
                          <Minus className="w-4 h-4 mx-auto" />
                        </button>
                        <span className="w-12 text-center font-bold text-sm">
                          {pickingQuantities[item.id] || 0}/{item.quantity}
                        </span>
                        <button
                          onClick={() => updatePickingQuantity(item.id, Math.min((pickingQuantities[item.id] || 0) + 1, item.quantity))}
                          className="bg-green-500 text-white w-8 h-8 rounded-full"
                        >
                          <Plus className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <h5 className="font-semibold mb-3 text-sm">Vælg anlæg:</h5>
                <div className="grid grid-cols-2 gap-2">
                  {getAvailableFacilities().map((facility) => {
                    const isSelected = selectedFacilities.some(f => f.id === facility.id);
                    return (
                      <button
                        key={facility.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedFacilities(prev => prev.filter(f => f.id !== facility.id));
                          } else {
                            setSelectedFacilities(prev => [...prev, facility]);
                          }
                        }}
                        className={`p-3 rounded-lg border-2 text-xs ${
                          isSelected 
                            ? 'bg-green-500 border-green-600 text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <div className="font-bold text-base">{facility.id}</div>
                        {isSelected && <span className="text-xs">✓ Valgt</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <button
                onClick={() => {
                  setShowFacilityDropdown(false);
                  setSelectedOrder(null);
                  setSelectedFacilities([]);
                }}
                className="flex-1 bg-gray-300 text-gray-800 px-4 py-3 rounded-lg font-semibold"
              >
                Annuller
              </button>
              <button
                onClick={() => {
                  if (selectedFacilities.length === 0) {
                    alert('Vælg mindst ét anlæg');
                    return;
                  }
                  setShowFacilityDropdown(false);
                  completeOrderPacking(selectedOrder.id, selectedFacilities);
                }}
                disabled={selectedFacilities.length === 0}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold"
              >
                Færdiggør
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE MODAL */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-60">
          <div className="bg-white rounded-t-2xl w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold">{employeeModalConfig.title}</h3>
              <button 
                onClick={() => setShowEmployeeModal(false)}
                className="absolute top-4 right-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => selectEmployee(employee)}
                    className="w-full p-3 bg-gray-50 hover:bg-blue-50 rounded-xl border flex items-center gap-3"
                  >
                    <User className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-semibold">{employee.name}</p>
                      <p className="text-xs text-gray-500">{employee.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RETURN MODAL */}
      {showReturnModal && returnOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold">Registrer Retur - {returnOrder.orderNumber}</h3>
              <button onClick={() => setShowReturnModal(false)}>
                <X className="w-5 h-5 absolute top-4 right-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tomme Fustager</label>
                  <div className="flex items-center justify-center gap-4">
                    <button 
                      onClick={() => setEmptyKegs(Math.max(0, emptyKegs - 1))} 
                      className="bg-red-500 text-white w-12 h-12 rounded-full"
                    >
                      <Minus className="w-6 h-6 mx-auto" />
                    </button>
                    <span className="text-2xl font-bold w-16 text-center">{emptyKegs}</span>
                    <button 
                      onClick={() => setEmptyKegs(emptyKegs + 1)} 
                      className="bg-green-500 text-white w-12 h-12 rounded-full"
                    >
                      <Plus className="w-6 h-6 mx-auto" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Fyldte Fustager</label>
                  <div className="flex items-center justify-center gap-4">
                    <button 
                      onClick={() => setFullKegs(Math.max(0, fullKegs - 1))} 
                      className="bg-red-500 text-white w-12 h-12 rounded-full"
                    >
                      <Minus className="w-6 h-6 mx-auto" />
                    </button>
                    <span className="text-2xl font-bold w-16 text-center">{fullKegs}</span>
                    <button 
                      onClick={() => setFullKegs(fullKegs + 1)} 
                      className="bg-green-500 text-white w-12 h-12 rounded-full"
                    >
                      <Plus className="w-6 h-6 mx-auto" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={drypbakkeReceived}
                      onChange={(e) => setDrypbakkeReceived(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Drypbakke modtaget</span>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold"
                >
                  Annuller
                </button>
                <button
                  onClick={completeReturn}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold"
                >
                  Godkend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIGNATURE MODAL */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold">Kunde Underskrift</h3>
              <button onClick={() => setShowSignatureModal(false)}>
                <X className="w-5 h-5 absolute top-4 right-4" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Kunde navn:</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm"
                  placeholder="Indtast kunde navn"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Bemærkninger:</label>
                <textarea
                  id="deliveryNotes"
                  className="w-full p-3 border rounded-lg text-sm"
                  rows="2"
                  placeholder="Evt. bemærkninger..."
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Underskrift:</label>
                <div className="border-2 border-gray-300 rounded-lg bg-white">
                  <svg
                    width="100%"
                    height="150"
                    viewBox="0 0 300 150"
                    className="cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  >
                    {signaturePaths.map((path, index) => (
                      <path
                        key={index}
                        d={path}
                        stroke="#000"
                        strokeWidth="2"
                        fill="none"
                      />
                    ))}
                    {currentPath && (
                      <path
                        d={currentPath}
                        stroke="#000"
                        strokeWidth="2"
                        fill="none"
                      />
                    )}
                  </svg>
                </div>
                <button
                  onClick={() => {
                    setSignaturePaths([]);
                    setCurrentPath('');
                  }}
                  className="mt-2 text-sm text-blue-600"
                >
                  Ryd underskrift
                </button>
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold"
                >
                  Annuller
                </button>
                <button
                  onClick={() => {
                    if (signaturePaths.length === 0) {
                      alert('Tegn venligst en underskrift');
                      return;
                    }
                    
                    openEmployeeModal('Vælg medarbejder', (employee) => {
                      setOrders(prev => prev.map(order => 
                        order.id === selectedOrder.id 
                          ? { ...order, status: 'shipped', shippedBy: employee.name }
                          : order
                      ));
                      
                      setShowSignatureModal(false);
                      setSelectedOrder(null);
                      setSignaturePaths([]);
                      alert(`Underskrift bekræftet af ${employee.name}`);
                      navigateToMain();
                    });
                  }}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold"
                >
                  Gem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
