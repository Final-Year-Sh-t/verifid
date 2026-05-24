import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Download,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ParsedRecord {
  index_number: string;
  full_name: string;
  organization: string;
  issued_at: string;
  expires_at: string;
  photo_url?: string;
  status?: string;
}

interface UploadResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

interface BulkUploadProps {
  institutionId: string | null;
  userId: string;
  onComplete: () => void;
}

const REQUIRED_COLUMNS = ['index_number', 'full_name', 'organization', 'issued_at', 'expires_at'];
const OPTIONAL_COLUMNS = ['photo_url', 'status'];

export function BulkUpload({ institutionId, userId, onComplete }: BulkUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRecord[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');

  const resetState = () => {
    setParsedData([]);
    setUploadResult(null);
    setProgress(0);
    setStep('upload');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (!['csv', 'xlsx', 'xls'].includes(fileType || '')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV or Excel file.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      let data: ParsedRecord[] = [];

      if (fileType === 'csv') {
        data = await parseCSV(file);
      } else {
        data = await parseExcel(file);
      }

      if (data.length === 0) {
        toast({
          title: 'No data found',
          description: 'The file appears to be empty or has invalid format.',
          variant: 'destructive',
        });
        return;
      }

      setParsedData(data);
      setStep('preview');
    } catch (error: any) {
      console.error('Parse error:', error);
      toast({
        title: 'Parse error',
        description: error.message || 'Failed to parse the file.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const parseCSV = (file: File): Promise<ParsedRecord[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const records = validateAndTransform(results.data as Record<string, string>[]);
            resolve(records);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => reject(error),
      });
    });
  };

  const parseExcel = async (file: File): Promise<ParsedRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);
          const records = validateAndTransform(jsonData);
          resolve(records);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const validateAndTransform = (data: Record<string, string>[]): ParsedRecord[] => {
    if (data.length === 0) {
      throw new Error('File is empty');
    }

    // Check for required columns
    const headers = Object.keys(data[0]).map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    return data.map((row) => {
      // Normalize keys
      const normalizedRow: Record<string, string> = {};
      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
        normalizedRow[normalizedKey] = String(value || '').trim();
      });

      return {
        index_number: normalizedRow.index_number || '',
        full_name: normalizedRow.full_name || '',
        organization: normalizedRow.organization || '',
        issued_at: formatDate(normalizedRow.issued_at),
        expires_at: formatDate(normalizedRow.expires_at),
        photo_url: normalizedRow.photo_url || undefined,
        status: normalizedRow.status || 'active',
      };
    });
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Try to parse various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try DD/MM/YYYY format
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    
    return dateStr;
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    
    const result: UploadResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < parsedData.length; i += batchSize) {
      batches.push(parsedData.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      const records = batch.map((record, idx) => {
        const rowNum = batchIndex * batchSize + idx + 2; // +2 for header row and 1-indexing
        
        // Validate required fields
        if (!record.index_number) {
          result.failed++;
          result.errors.push({ row: rowNum, message: 'Missing identification number' });
          return null;
        }
        if (!record.full_name) {
          result.failed++;
          result.errors.push({ row: rowNum, message: 'Missing full name' });
          return null;
        }
        if (!record.organization) {
          result.failed++;
          result.errors.push({ row: rowNum, message: 'Missing organization' });
          return null;
        }
        if (!record.issued_at) {
          result.failed++;
          result.errors.push({ row: rowNum, message: 'Missing issue date' });
          return null;
        }
        if (!record.expires_at) {
          result.failed++;
          result.errors.push({ row: rowNum, message: 'Missing expiry date' });
          return null;
        }

        return {
          index_number: record.index_number.toUpperCase(),
          full_name: record.full_name,
          organization: record.organization,
          issued_at: record.issued_at,
          expires_at: record.expires_at,
          photo_url: record.photo_url || null,
          status: (['active', 'inactive', 'expired'].includes(record.status || '') 
            ? record.status 
            : 'active') as 'active' | 'inactive' | 'expired',
          created_by: userId,
          institution_id: institutionId,
        };
      }).filter(Boolean);

      if (records.length > 0) {
        const { error } = await supabase
          .from('index_records')
          .insert(records as any[]);

        if (error) {
          console.error('Batch insert error:', error);
          batch.forEach((_, idx) => {
            const rowNum = batchIndex * batchSize + idx + 2;
            if (!result.errors.find(e => e.row === rowNum)) {
              result.failed++;
              result.errors.push({ row: rowNum, message: error.message });
            }
          });
        } else {
          result.success += records.length;
        }
      }

      setProgress(Math.round(((batchIndex + 1) / batches.length) * 100));
    }

    setUploadResult(result);
    setStep('result');
    setIsProcessing(false);

    if (result.success > 0) {
      onComplete();
    }
  };

  const downloadTemplate = () => {
    const headers = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
    const sampleData = [
      headers.join(','),
      'ID-2024-001,John Doe,Engineering Department,2024-01-01,2025-12-31,,active',
      'ID-2024-002,Jane Smith,Science Department,2024-01-01,2025-12-31,,inactive',
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Upload Students
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file with student data.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div 
                  className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-secondary/50 rounded-lg transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isProcessing ? (
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  ) : (
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  )}
                  <p className="font-medium mb-1">
                    {isProcessing ? 'Processing file...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    CSV or Excel files (.csv, .xlsx, .xls)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Download Template</p>
                  <p className="text-xs text-muted-foreground">Get a sample CSV with correct format</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Required columns:</p>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_COLUMNS.map(col => (
                  <Badge key={col} variant="secondary">{col}</Badge>
                ))}
              </div>
              <p className="text-sm font-medium mt-3">Optional columns:</p>
              <div className="flex flex-wrap gap-2">
                {OPTIONAL_COLUMNS.map(col => (
                  <Badge key={col} variant="outline">{col}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {parsedData.length} records ready to upload
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetState}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={isProcessing}
                  className="gradient-primary border-0"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload {parsedData.length} Records
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">{progress}% complete</p>
              </div>
            )}

            <div className="max-h-64 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{record.index_number}</TableCell>
                      <TableCell>{record.full_name}</TableCell>
                      <TableCell>{record.organization}</TableCell>
                      <TableCell>{record.expires_at}</TableCell>
                    </TableRow>
                  ))}
                  {parsedData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        ... and {parsedData.length - 10} more records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === 'result' && uploadResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                  <div className="text-2xl font-bold font-display">{uploadResult.success}</div>
                  <p className="text-sm text-muted-foreground">Uploaded successfully</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <div className="text-2xl font-bold font-display">{uploadResult.failed}</div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </CardContent>
              </Card>
            </div>

            {uploadResult.errors.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Errors ({uploadResult.errors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-auto space-y-1">
                    {uploadResult.errors.slice(0, 20).map((error, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-mono text-muted-foreground">Row {error.row}:</span>{' '}
                        <span className="text-destructive">{error.message}</span>
                      </div>
                    ))}
                    {uploadResult.errors.length > 20 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {uploadResult.errors.length - 20} more errors
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={() => setIsOpen(false)} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
