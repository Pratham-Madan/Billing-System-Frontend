import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import Navbar from "../components/Navbar";
import "../styles/modifyPrices.css";

import { FiArrowLeft, FiSave, FiSearch } from "react-icons/fi";

import { API_BASE_URL } from "../services/api";
import getAuthToken from "../utils/auth";

export default function ModifyPrices() {
  const navigate = useNavigate();
  const location = useLocation();
  const { buyerId } = useParams();

  const buyer = location.state?.buyer || {
    id: buyerId,
    name: "Unknown Buyer",
  };

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState([]);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetchPricing();
  }, [buyerId, navigate]);

  const fetchPricing = async () => {
    try {
      setLoading(true);

      const token = getAuthToken();

      const response = await fetch(
        `${API_BASE_URL}/Customers/${buyerId}/pricing/bill-ready`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (result.success) {
        const mappedProducts = result.data.map((item) => ({
          id: item.productId,
          sku: item.modelNumber,
          name: item.productName,
          category: item.categoryName || "Uncategorized",
          stock: item.stock,
          buyerPrice: item.effectivePrice,
          hasCustomPrice: item.hasCustomPrice,
        }));

        setProducts(mappedProducts);
      }
    } catch (error) {
      console.error("Failed to load pricing", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrice = (id, value) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id
          ? {
              ...product,
              buyerPrice: value,
            }
          : product,
      ),
    );
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toString().includes(search),
  );

  const handleSave = async () => {
    try {
      const token = getAuthToken();

      for (const product of products) {
        const endpoint = product.hasCustomPrice
          ? `${API_BASE_URL}/Customers/${buyerId}/pricing/${product.id}`
          : `${API_BASE_URL}/Customers/${buyerId}/pricing`;

        const method = product.hasCustomPrice ? "PUT" : "POST";

        const body = product.hasCustomPrice
          ? {
              negotiatedPrice: product.buyerPrice,
            }
          : {
              productId: product.id,
              negotiatedPrice: product.buyerPrice,
            };

        const response = await fetch(endpoint, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Failed to update pricing");
        }
      }

      await fetchPricing();

      alert(`Pricing updated successfully for ${buyer.name}`);
    } catch (error) {
      console.error("Pricing update failed:", error);

      alert("Failed to update pricing");
    }
  };

  if (loading) {
    return (
      <div className="modify-prices-page">
        <Navbar />

        <div
          style={{
            padding: "100px 24px",
          }}
        >
          Loading pricing...
        </div>
      </div>
    );
  }

  return (
    <div className="modify-prices-page">
      <Navbar />

      <div className="modify-prices-container">
        <div className="pricing-header">
          <div>
            <button className="back-btn" onClick={() => navigate("/buyers")}>
              <FiArrowLeft />
              Back to Buyers
            </button>

            <h1>Modify Buyer Pricing</h1>

            <p>
              Configure custom pricing for
              <strong> {buyer.name}</strong>
            </p>
          </div>

          <button className="save-btn" onClick={handleSave}>
            <FiSave />
            Save Changes
          </button>
        </div>

        <div className="buyer-summary-card">
          <div className="summary-item">
            <span>Buyer Name</span>

            <strong>{buyer.name}</strong>
          </div>

          <div className="summary-item">
            <span>Products</span>

            <strong>{filteredProducts.length}</strong>
          </div>

          <div className="summary-item">
            <span>Pricing Type</span>

            <strong>Negotiated Pricing</strong>
          </div>
        </div>

        <div className="search-box">
          <FiSearch />

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="catalog-card">
          <table className="catalog-pricing-table">
            <thead>
              <tr>
                <th>MODEL</th>
                <th>PRODUCT</th>
                <th>CATEGORY</th>
                <th>STOCK</th>
                <th>BUYER PRICE</th>
                <th>CUSTOM</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.sku}</td>

                  <td>{product.name}</td>

                  <td>{product.category}</td>

                  <td>{product.stock}</td>

                  <td>
                    <input
                      className="price-input"
                      type="number"
                      value={product.buyerPrice}
                      onChange={(e) =>
                        updatePrice(product.id, Number(e.target.value))
                      }
                    />
                  </td>

                  <td>{product.hasCustomPrice ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
