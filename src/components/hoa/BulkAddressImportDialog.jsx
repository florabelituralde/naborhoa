import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Upload, MapPin, FileUp, ClipboardPaste, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function BulkAddressImportDialog({ open, onOpenChange, community, existingProperties = [], onDone }) {
  const [mode, setMode] = useState("paste");
  const [pastedText, setPastedText] = useState("");
  const [file, setFile] = useState(null);
  const [parsedAddresses, setParsedAddresses] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const existingSet = new Set(
    (existingProperties || []).map((p) => (p.address || "").toLowerCase().trim()).filter(Boolean)
  );

  const reset = () => {
    setPastedText("");
    setFile(null);
    setParsedAddresses([]);
    setError("");
    setMode("paste");
  };

  const parsePaste = () => {
    const addresses = pastedText
      .split("\n")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
    setParsedAddresses(addresses);
    setError("");
  };

  const parseFile = async () => {
    if (!file) return;
    setProcessing(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            addresses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  address: { type: "string" },
                },
                required: ["address"],
              },
            },
          },
          required: ["addresses"],
        },
      });
      const output = result.output;
      const addresses = Array.isArray(output)
        ? output.map((o) => o.address).filter(Boolean)
        : (output?.addresses || []).map((a) => a.address).filter(Boolean);
      if (addresses.length === 0) {
        setError("No addresses found in file. Make sure there's an 'address' column.");
      } else {
        setParsedAddresses(addresses);
      }
    } catch (err) {
      setError(err.message || "Failed to parse file. Try pasting addresses instead.");
    }
    setProcessing(false);
  };

  const duplicates = parsedAddresses.filter((a) => existingSet.has(a.toLowerCase().trim()));
  const newAddresses = parsedAddresses.filter((a) => !existingSet.has(a.toLowerCase().trim()));

  const handleImport = async () => {
    if (newAddresses.length === 0) {
      setError("All addresses already exist in this community.");
      return;
    }
    setImporting(true);
    setError("");
    try {
      await base44.entities.Property.bulkCreate(
        newAddresses.map((address) => ({
          community_id: community.id,
          address,
        }))
      );
      toast({
        title: "Addresses imported",
        description: `${newAddresses.length} propert${newAddresses.length === 1 ? "y" : "ies"} added.`,
      });
      reset();
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      setError(err.message || "Failed to import addresses");
    }
    setImporting(false);
  };

  const handleOpenChange = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Import Neighborhood Addresses
          </DialogTitle>
          <DialogDescription>
            Add all property addresses at once. Paste a list or upload a CSV/Excel file with an "address" column.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setMode("paste");
                setParsedAddresses([]);
              }}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                mode === "paste" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <ClipboardPaste className="w-4 h-4" /> Paste List
            </button>
            <button
              onClick={() => {
                setMode("file");
                setParsedAddresses([]);
              }}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                mode === "file" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <FileUp className="w-4 h-4" /> Upload File
            </button>
          </div>

          {mode === "paste" ? (
            <div>
              <Label>One address per line</Label>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={6}
                className="mt-1.5 text-sm"
                placeholder={"123 Maple St\n456 Oak Ave\n789 Elm Dr"}
              />
              <Button
                onClick={parsePaste}
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={!pastedText.trim()}
              >
                Preview Addresses
              </Button>
            </div>
          ) : (
            <div>
              <Label>CSV or Excel file</Label>
              <div
                onClick={() => document.getElementById("bulk-address-file").click()}
                className="mt-1.5 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
              >
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">Click to select CSV or Excel file</p>
                  </>
                )}
              </div>
              <input
                id="bulk-address-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <Button
                onClick={parseFile}
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={!file || processing}
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Parse File
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {parsedAddresses.length > 0 && (
            <div className="rounded-xl bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{parsedAddresses.length} addresses found</span>
                <span className="text-muted-foreground">
                  {newAddresses.length} new · {duplicates.length} duplicate
                  {duplicates.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {parsedAddresses.map((addr, i) => {
                  const isDup = existingSet.has(addr.toLowerCase().trim());
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                        isDup ? "text-muted-foreground" : ""
                      }`}
                    >
                      <span className="truncate flex-1">{addr}</span>
                      {isDup && <span className="text-xs text-muted-foreground shrink-0">exists</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing || newAddresses.length === 0}>
            {importing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Import{newAddresses.length > 0 ? ` ${newAddresses.length}` : ""} Address
            {newAddresses.length !== 1 ? "es" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}