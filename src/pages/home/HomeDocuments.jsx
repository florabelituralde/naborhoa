import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Loader2, FileText, Download } from "lucide-react";
import { formatDate } from "@/lib/format";

const CATEGORY_COLORS = {
  bylaws: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  rules: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  minutes: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  forms: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
};

export default function HomeDocuments() {
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (!community) {
      setLoading(false);
      return;
    }
    setLoading(true);
    base44.entities.Document.filter({ community_id: community.id, is_public: true }, "-created_date")
      .then(docs => setDocuments(docs))
      .finally(() => setLoading(false));
  }, [community]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader title="Documents" subtitle="Community governing documents and forms" />

      {documents.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No documents available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="bg-card rounded-2xl warm-shadow p-5 flex flex-col">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{doc.title}</h3>
                  {doc.description && <p className="text-sm text-muted-foreground truncate">{doc.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other}`}>
                      {doc.category}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(doc.created_date)}</span>
                  </div>
                </div>
              </div>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}