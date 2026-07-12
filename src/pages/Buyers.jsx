import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import "../styles/buyers.css";
import "../styles/buyerSidePanel.css";
import "../styles/buyersTable.css";
import "../styles/editBuyerModal.css";
import "../styles/buyerInsights.css";
import BuyerTable from "../components/BuyerTable";
import BuyerSidePanel from "../components/BuyerSidePanel";

import NewBuyerModal from "../components/NewBuyerModal";
import EditBuyerModal from "../components/EditBuyerModal";
import BuyerPricingModal from "../components/BuyerPricingModal";
import BuyerInsightsModal from "../components/BuyerInsightsModal";

import { FiDownload, FiPlus } from "react-icons/fi";
import Navbar from "../components/Navbar";
import { API_BASE_URL } from "../services/api";
import getAuthToken from "../utils/auth";
export default function Buyers() {
  const navigate = useNavigate();
  const location = useLocation();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState(null);

  const [editingBuyer, setEditingBuyer] = useState(null);

  const [insightsBuyer, setInsightsBuyer] = useState(null);

  const [pricingBuyer, setPricingBuyer] = useState(null);

  const [showNewBuyerModal, setShowNewBuyerModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const [showPricingModal, setShowPricingModal] = useState(false);

  const [showInsightsModal, setShowInsightsModal] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetchCustomers();
    fetchDashboardSummary();
  }, [navigate]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const token = getAuthToken();

      const [customersResponse, salesResponse, invoicesResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/Customers`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),

          fetch(`${API_BASE_URL}/Reports/customer-sales`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),

          fetch(`${API_BASE_URL}/Invoices`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        ]);

      const customersResult = await customersResponse.json();

      const salesResult = await salesResponse.json();

      const invoicesResult = await invoicesResponse.json();

      const salesData = salesResult.success ? salesResult.data : [];

      const invoiceData = invoicesResult.success
        ? invoicesResult.data?.data || []
        : [];

      const mappedCustomers = customersResult.data.map((customer) => {
        const salesInfo = salesData.find(
          (sale) => sale.customerId === customer.id,
        );

        const pendingAmount = invoiceData
          .filter(
            (invoice) =>
              invoice.partyName === customer.partyName &&
              invoice.status === "pending",
          )
          .reduce((sum, invoice) => sum + Number(invoice.grandTotal || 0), 0);

        return {
          id: customer.id,

          initials: customer.partyName
            .split(" ")
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase(),

          name: customer.partyName,

          location: customer.billingAddress || "",

          gst: customer.gstin || "",

          phone: customer.phone || "",

          email: customer.email || "",

          revenue: `₹${(salesInfo?.totalSales || 0).toLocaleString()}`,

          pending: `₹${pendingAmount.toLocaleString()}`,

          status: customer.isActive ? "ACTIVE" : "INACTIVE",

          contactPerson: customer.contactPerson || "",

          panNumber: customer.panNumber || "",

          billingAddress: customer.billingAddress || "",

          shippingAddress: customer.shippingAddress || "",
        };
      });

      setBuyers(mappedCustomers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardSummary = async () => {
    try {
      const token = getAuthToken();

      const response = await fetch(`${API_BASE_URL}/Dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        setDashboardSummary(result.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard summary", error);
    }
  };

  useEffect(() => {
    if (location.state?.openAddBuyer) {
      setShowNewBuyerModal(true);

      // Clear transient route state so the modal does not reopen unintentionally.
      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [location.pathname, location.state, navigate]);

  const handleCreateBuyer = async (buyerData) => {
    try {
      const token = getAuthToken();

      const response = await fetch(`${API_BASE_URL}/Customers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partyName: buyerData.name,
          contactPerson: buyerData.contactPerson,

          phone: buyerData.phone,

          email: buyerData.email,

          billingAddress: buyerData.billingAddress,

          shippingAddress: buyerData.shippingAddress,

          gstin: buyerData.gst,

          panNumber: buyerData.panNumber,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowNewBuyerModal(false);

        await fetchCustomers();

        alert("Buyer created successfully");
      } else {
        alert(result.message || "Failed to create buyer");
      }
    } catch (error) {
      console.error("Create buyer failed:", error);

      alert("Failed to create buyer");
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Buyer Name",
      "Contact Person",
      "GST Number",
      "PAN Number",
      "Phone",
      "Email",
      "Revenue",
      "Pending Amount",
      "Billing Address",
      "Shipping Address",
      "Status",
    ];

    const rows = buyers.map((buyer) => [
      buyer.name,
      buyer.contactPerson,
      buyer.gst,
      buyer.panNumber,
      buyer.phone,
      buyer.email,
      buyer.revenue,
      buyer.pending,
      buyer.billingAddress,
      buyer.shippingAddress,
      buyer.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `buyers_${new Date().toISOString().split("T")[0]}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };
  if (loading) {
    return (
      <div className="buyers-page">
        <Navbar />
        <p style={{ padding: "100px 20px" }}>Loading buyers...</p>
      </div>
    );
  }

  return (
    <div className="buyers-page">
      {/* HEADER */}
      <Navbar />

      <div className="buyers-top">
        <div>
          <h1>Buyer's Directory</h1>

          <p>Manage your industrial client database and pricing agreements.</p>
        </div>

        <div className="buyers-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <FiDownload
              style={{
                paddingTop: "6px",
                paddingRight: "4px",
              }}
            />
            Export CSV
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowNewBuyerModal(true)}
          >
            + New Buyer
          </button>
        </div>
      </div>

      {/* KPI CARDS */}

      <div className="buyers-kpis">
        <div className="kpi-card">
          <div className="kpi-label">Total Buyers</div>

          <h2>{dashboardSummary?.totalCustomers ?? buyers.length}</h2>

          <p>Active Customer Base</p>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Month Sales</div>

          <h2>₹{(dashboardSummary?.monthSales || 0).toLocaleString()}</h2>

          <p>Today: ₹{(dashboardSummary?.todaySales || 0).toLocaleString()}</p>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Pending Receivables</div>

          <h2 className="danger">
            ₹{(dashboardSummary?.totalPendingAmount || 0).toLocaleString()}
          </h2>

          <p className="danger">
            {dashboardSummary?.pendingCount || 0} Pending Invoices
          </p>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Products</div>

          <h2>{dashboardSummary?.totalProducts || 0}</h2>

          <p>{dashboardSummary?.paidCount || 0} Paid Invoices</p>
        </div>
      </div>

      <div className="buyers-layout">
        <div className="buyers-table-section">
          <BuyerTable
            buyers={buyers}
            onView={setSelectedBuyer}
            onEdit={(buyer) => {
              console.log("Editing buyer:", buyer);
              setSelectedBuyer(null);
              setEditingBuyer(buyer);
              setShowEditModal(true);
            }}
            onInsights={(buyer) => {
              setSelectedBuyer(null);
              setInsightsBuyer(buyer);
              setShowInsightsModal(true);
            }}
          />
        </div>
        {selectedBuyer && (
          <div className="drawer-overlay">
            <BuyerSidePanel
              buyer={selectedBuyer}
              // setPricingBuyer(selectedBuyer);
              // setSelectedBuyer(null);
              // setShowPricingModal(true);
              onModifyPrices={() => {
                navigate(`/modify-prices/${selectedBuyer.id}`, {
                  state: { buyer: selectedBuyer },
                });
              }}
              onCreateOrder={() =>
                navigate(`/create-order`, {
                  state: { buyer: selectedBuyer },
                })
              }
              onClose={() => setSelectedBuyer(null)}
            />
          </div>
        )}
      </div>

      {/* MODALS */}

      <NewBuyerModal
        open={showNewBuyerModal}
        onClose={() => setShowNewBuyerModal(false)}
        onCreate={handleCreateBuyer}
      />

      <EditBuyerModal
        open={showEditModal}
        buyer={editingBuyer}
        fetchCustomers={fetchCustomers}
        onClose={() => {
          setShowEditModal(false);
          setEditingBuyer(null);
        }}
      />

      <BuyerPricingModal
        open={showPricingModal}
        buyer={pricingBuyer}
        onClose={() => {
          setPricingBuyer(null);
          setShowPricingModal(false);
        }}
      />

      <BuyerInsightsModal
        open={showInsightsModal}
        buyer={insightsBuyer}
        onClose={() => {
          setInsightsBuyer(null);
          setShowInsightsModal(false);
        }}
      />

      {!selectedBuyer && (
        <button className="fab" onClick={() => setShowNewBuyerModal(true)}>
          <FiPlus />
        </button>
      )}
    </div>
  );
}
