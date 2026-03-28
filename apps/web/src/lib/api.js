import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken',  data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── API helpers ───────────────────────────────────────────────────────────────

export const authApi = {
  login:          (body) => api.post('/auth/login',           body),
  logout:         ()     => api.post('/auth/logout'),
  me:             ()     => api.get('/auth/me'),
  changePassword: (body) => api.patch('/auth/change-password', body),
};

export const dashboardApi = {
  summary: () => api.get('/dashboard'),
  me:      () => api.get('/dashboard/me'),
};

export const salesApi = {
  getLeads:       (params) => api.get('/sales/leads',             { params }),
  getLead:        (id)     => api.get(`/sales/leads/${id}`),
  createLead:     (body)   => api.post('/sales/leads',            body),
  updateLead:     (id, b)  => api.patch(`/sales/leads/${id}`,     b),
  addActivity:    (id, b)  => api.post(`/sales/leads/${id}/activities`, b),
  getPipeline:    ()       => api.get('/sales/pipeline'),
  getClients:     (params) => api.get('/sales/clients',           { params }),
  getClient:      (id)     => api.get(`/sales/clients/${id}`),
  createClient:   (body)   => api.post('/sales/clients',          body),
  getQuotations:  (params) => api.get('/sales/quotations',        { params }),
  getQuotation:   (id)     => api.get(`/sales/quotations/${id}`),
  createQuotation:(body)   => api.post('/sales/quotations',       body),
  updateQuotation:(id, b)  => api.patch(`/sales/quotations/${id}`, b),
  sendQuotation:  (id)     => api.patch(`/sales/quotations/${id}/send`),
  getAnalytics:   ()       => api.get('/sales/analytics/summary'),
};

export const inventoryApi = {
  getMaterials:   (params) => api.get('/inventory/materials',     { params }),
  getMaterial:    (id)     => api.get(`/inventory/materials/${id}`),
  createMaterial: (body)   => api.post('/inventory/materials',    body),
  updateMaterial: (id, b)  => api.patch(`/inventory/materials/${id}`, b),
  stockIn:        (body)   => api.post('/inventory/stock/in',     body),
  stockOut:       (body)   => api.post('/inventory/stock/out',    body),
  transfer:       (body)   => api.post('/inventory/stock/transfer', body),
  getMovements:   (params) => api.get('/inventory/stock/movements', { params }),
  getSuppliers:   ()       => api.get('/inventory/suppliers'),
  createSupplier: (body)   => api.post('/inventory/suppliers',    body),
  getPOs:         (params) => api.get('/inventory/purchase-orders', { params }),
  createPO:       (body)   => api.post('/inventory/purchase-orders', body),
  getAlerts:      ()       => api.get('/inventory/alerts'),
  dismissAlert:   (id)     => api.patch(`/inventory/alerts/${id}/read`),
  getCategories:  ()       => api.get('/inventory/categories'),
  getSummary:     ()       => api.get('/inventory/reports/summary'),
  getConsumption: (params) => api.get('/inventory/reports/consumption', { params }),
};

export const hrApi = {
  getEmployees:   (params) => api.get('/hr/employees',            { params }),
  getEmployee:    (id)     => api.get(`/hr/employees/${id}`),
  createEmployee: (body)   => api.post('/hr/employees',           body),
  updateEmployee: (id, b)  => api.patch(`/hr/employees/${id}`,    b),
  getEmployeeCost:(id)     => api.get(`/hr/employees/${id}/cost`),
  getDepts:       ()       => api.get('/hr/departments'),
  getAttendance:  (params) => api.get('/hr/attendance',           { params }),
  markAttendance: (body)   => api.post('/hr/attendance',          body),
  checkIn:        (body)   => api.post('/hr/attendance/checkin',  body),
  checkOut:       (body)   => api.post('/hr/attendance/checkout', body),
  getLeaves:      (params) => api.get('/hr/leave',                { params }),
  createLeave:    (body)   => api.post('/hr/leave',               body),
  approveLeave:   (id)     => api.patch(`/hr/leave/${id}/approve`),
  rejectLeave:    (id, b)  => api.patch(`/hr/leave/${id}/reject`, b),
  getPayrolls:    ()       => api.get('/hr/payroll'),
  getPayroll:     (id)     => api.get(`/hr/payroll/${id}`),
  generatePayroll:(body)   => api.post('/hr/payroll/generate',    body),
  approvePayroll: (id)     => api.patch(`/hr/payroll/${id}/approve`),
  markPaid:       (id)     => api.patch(`/hr/payroll/${id}/mark-paid`),
  getReviews:     (params) => api.get('/hr/performance',          { params }),
  createReview:   (body)   => api.post('/hr/performance',         body),
  getExpiryAlerts:()       => api.get('/hr/expiry-alerts'),
};

export const projectsApi = {
  getProjects:    (params) => api.get('/projects',                { params }),
  getProject:     (id)     => api.get(`/projects/${id}`),
  createProject:  (body)   => api.post('/projects',               body),
  updateProject:  (id, b)  => api.patch(`/projects/${id}`,        b),
  getBudget:      (id)     => api.get(`/projects/${id}/budget`),
  getBOQs:        (id)     => api.get(`/projects/${id}/boq`),
  createBOQ:      (id, b)  => api.post(`/projects/${id}/boq`,     b),
  getWorkOrders:  (id)     => api.get(`/projects/${id}/work-orders`),
  createWorkOrder:(id, b)  => api.post(`/projects/${id}/work-orders`, b),
  getSiteReports: (id)     => api.get(`/projects/${id}/site-reports`),
  createSiteReport:(id,b)  => api.post(`/projects/${id}/site-reports`, b),
  getDrawings:    (id)     => api.get(`/projects/${id}/drawings`),
  uploadDrawing:  (id, b)  => api.post(`/projects/${id}/drawings`, b),
};

export const accountingApi = {
  getAccounts:    ()       => api.get('/accounting/accounts'),
  createAccount:  (body)   => api.post('/accounting/accounts',    body),
  getJournals:    (params) => api.get('/accounting/journal-entries', { params }),
  createJournal:  (body)   => api.post('/accounting/journal-entries', body),
  postJournal:    (id)     => api.patch(`/accounting/journal-entries/${id}/post`),
  getInvoices:    (params) => api.get('/accounting/invoices',     { params }),
  getInvoice:     (id)     => api.get(`/accounting/invoices/${id}`),
  createInvoice:  (body)   => api.post('/accounting/invoices',    body),
  sendInvoice:    (id)     => api.patch(`/accounting/invoices/${id}/send`),
  addPayment:     (id, b)  => api.post(`/accounting/invoices/${id}/payments`, b),
  getRetentions:  (params) => api.get('/accounting/retentions',   { params }),
  releaseRetention:(id,b)  => api.patch(`/accounting/retentions/${id}/release`, b),
  getVATReturns:  ()       => api.get('/accounting/vat-returns'),
  calcVAT:        (body)   => api.post('/accounting/vat-returns/calculate', body),
  getBankAccounts:()       => api.get('/accounting/bank-accounts'),
  getBankTxns:    (id, p)  => api.get(`/accounting/bank-accounts/${id}/transactions`, { params: p }),
  addBankTxn:     (id, b)  => api.post(`/accounting/bank-accounts/${id}/transactions`, b),
  getPL:          (params) => api.get('/accounting/reports/profit-loss', { params }),
  getARaging:     ()       => api.get('/accounting/reports/ar-aging'),
  getProjectProfit:()      => api.get('/accounting/reports/project-profit'),
};

export const vehicleApi = {
  getVehicles:    ()       => api.get('/vehicles'),
  getVehicle:     (id)     => api.get(`/vehicles/${id}`),
  createVehicle:  (body)   => api.post('/vehicles',               body),
  addFuel:        (id, b)  => api.post(`/vehicles/${id}/fuel`,    b),
  addMaintenance: (id, b)  => api.post(`/vehicles/${id}/maintenance`, b),
  addSalik:       (id, b)  => api.post(`/vehicles/${id}/salik`,   b),
  getExpenses:    (id, p)  => api.get(`/vehicles/${id}/expenses`, { params: p }),
};

export const pettyCashApi = {
  getFunds:       ()       => api.get('/petty-cash/funds'),
  getRequests:    (params) => api.get('/petty-cash/requests',     { params }),
  createRequest:  (body)   => api.post('/petty-cash/requests',    body),
  approve:        (id)     => api.patch(`/petty-cash/requests/${id}/approve`),
  reject:         (id, b)  => api.patch(`/petty-cash/requests/${id}/reject`, b),
  getSummary:     (params) => api.get('/petty-cash/summary',      { params }),
};

export const subcontractorApi = {
  getAll:         ()       => api.get('/subcontractors'),
  get:            (id)     => api.get(`/subcontractors/${id}`),
  create:         (body)   => api.post('/subcontractors',          body),
  update:         (id, b)  => api.patch(`/subcontractors/${id}`,   b),
  addPayment:     (id, b)  => api.post(`/subcontractors/${id}/payments`, b),
};

export const documentsApi = {
  getAll:         (params) => api.get('/documents',               { params }),
  upload:         (body)   => api.post('/documents',               body),
  delete:         (id)     => api.delete(`/documents/${id}`),
};

export const notificationsApi = {
  getAll:         (params) => api.get('/notifications',           { params }),
  markRead:       (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead:    ()       => api.patch('/notifications/read-all'),
  getUnreadCount: ()       => api.get('/notifications/unread-count'),
};
