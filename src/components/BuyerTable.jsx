import { useState } from "react";
import {
  FiEye,
  FiEdit2,
  FiBarChart2,
} from "react-icons/fi";

export default function BuyerTable({
  buyers,
  onView,
  onEdit,
  onInsights,
}) {
  const [filterStatus, setFilterStatus] = useState("All Buyers");
  const [activeTag, setActiveTag] = useState("WHOLESALE");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredBuyers = buyers.filter((buyer) => {
    if (filterStatus === "All Buyers") return true;
    if (filterStatus === "Settled") return buyer.pending === "₹0";
    if (filterStatus === "Pending" || filterStatus === "Overdue") return buyer.pending !== "₹0";
    return true;
  });

  const totalPages = Math.ceil(filteredBuyers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBuyers = filteredBuyers.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="roster-card">
      <div className="roster-header">
        <div className="roster-left">
          <h3>Client Roster</h3>

          <div className="roster-tags">
            <button 
              className={`tag ${activeTag === "WHOLESALE" ? "active" : ""}`}
              onClick={() => setActiveTag("WHOLESALE")}
            >
              WHOLESALE
            </button>

            <button 
              className={`tag ${activeTag === "GLOBAL" ? "active" : ""}`}
              onClick={() => setActiveTag("GLOBAL")}
            >
              GLOBAL
            </button>
          </div>
        </div>

        <div className="roster-right">
          <span>Filter by Status:</span>

          <select value={filterStatus} onChange={handleFilterChange}>
            <option value="All Buyers">All Buyers</option>
            <option value="Settled">Settled</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* SCROLLABLE TABLE */}
      <div className="buyers-table-wrapper">
        <table className="buyers-table">
          <thead>
            <tr>
              <th>BUYER NAME</th>
              <th>GST NUMBER</th>
              <th>PHONE & EMAIL</th>
              <th>TOTAL REVENUE</th>
              <th>PENDING AMOUNT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {paginatedBuyers.map((buyer) => (
              <tr key={buyer.id}>
                <td>
                  <div className="buyer-cell">
                    <div className="avatar">
                      {buyer.initials}
                    </div>

                    <div>
                      <div className="buyer-name">
                        {buyer.name}
                      </div>
                    </div>
                  </div>
                </td>

                <td><span className="gst-number">{buyer.gst}</span></td>

                <td>
                  <div className="contact-block">
                    <div>
                      {buyer.phone}
                    </div>

                    <a
                      className="email-link"
                      href={`mailto:${buyer.email}`}
                    >
                      {buyer.email}
                    </a>
                  </div>
                </td>

                <td className="revenue">
                  {buyer.revenue}
                </td>

                <td>
                  <div className="pending-cell">
                    <div
                      className={
                        buyer.pending === "₹0"
                          ? "pending-zero"
                          : "pending-red"
                      }
                    >
                      {buyer.pending}
                    </div>

                    <span>
                      {buyer.status}
                    </span>
                  </div>
                </td>

                <td>
                  <div className="action-icons">
                    <button
                      title="View Buyer"
                      onClick={() => onView(buyer)}
                    >
                      <FiEye />
                    </button>

                    <button
                      title="Edit Buyer"
                      onClick={() => onEdit(buyer)}
                    >
                      <FiEdit2 />
                    </button>

                    <button
                      title="Insights"
                      onClick={() =>
                        onInsights(buyer)
                      }
                    >
                      <FiBarChart2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>
          Showing {filteredBuyers.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredBuyers.length)} of{" "}
          {filteredBuyers.length} buyers
        </span>

        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1}
          >
            ‹
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              className={currentPage === i + 1 ? "active-page" : ""}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}