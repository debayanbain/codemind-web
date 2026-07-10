export function ReportPreview() {
  return (
    <div className="report-preview" aria-hidden="true">
      <div className="report-preview-head">
        <span className="badge badge-done">done</span>
        <span className="report-preview-repo">acme/checkout-service</span>
      </div>

      <div className="report-preview-diagram">
        <svg viewBox="0 0 320 110" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="42" width="76" height="28" rx="6" stroke="#5b8def" strokeWidth="1.5" />
          <text x="46" y="60" textAnchor="middle" fontSize="9" fill="#f5f5f5" fontFamily="monospace">
            api
          </text>
          <rect x="122" y="8" width="76" height="28" rx="6" stroke="#8b5cf6" strokeWidth="1.5" />
          <text x="160" y="26" textAnchor="middle" fontSize="9" fill="#f5f5f5" fontFamily="monospace">
            queue
          </text>
          <rect x="122" y="76" width="76" height="28" rx="6" stroke="#46d296" strokeWidth="1.5" />
          <text x="160" y="94" textAnchor="middle" fontSize="9" fill="#f5f5f5" fontFamily="monospace">
            worker
          </text>
          <rect x="236" y="42" width="76" height="28" rx="6" stroke="#ffb347" strokeWidth="1.5" />
          <text x="274" y="60" textAnchor="middle" fontSize="9" fill="#f5f5f5" fontFamily="monospace">
            db
          </text>
          <path d="M84 52L122 26" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
          <path d="M84 60L122 88" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
          <path d="M198 26L236 52" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
          <path d="M198 88L236 60" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
        </svg>
      </div>

      <table className="report-preview-table">
        <tbody>
          <tr>
            <td><span className="badge badge-failed">high</span></td>
            <td>Unbounded query in <code>orders.ts:88</code></td>
          </tr>
          <tr>
            <td><span className="badge badge-running">med</span></td>
            <td><code>moment</code> unmaintained since 2020</td>
          </tr>
          <tr>
            <td><span className="badge badge-done">low</span></td>
            <td>Missing docstring on <code>refund()</code></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
