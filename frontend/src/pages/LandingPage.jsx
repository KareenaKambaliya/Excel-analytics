import { useState } from 'react';
import { UploadZone } from '../components/UploadZone';
import { BarChart3, PieChart, TrendingUp, Filter, FileSpreadsheet, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { parseExcelFile } from '../utils/excelParser';
import { toast } from 'sonner';

const features = [
  {
    icon: FileSpreadsheet,
    title: 'Multi-Sheet Support',
    description: 'Upload Excel files with multiple sheets and switch between them instantly.'
  },
  {
    icon: BarChart3,
    title: 'Dynamic Charts',
    description: 'Bar charts, line graphs, pie charts - all generated automatically from your data.'
  },
  {
    icon: Filter,
    title: 'Smart Filters',
    description: 'Filter by date ranges and custom attributes detected from your spreadsheet columns.'
  },
  {
    icon: Zap,
    title: 'Instant Processing',
    description: 'Client-side processing means your data never leaves your browser.'
  }
];

export default function LandingPage({ onDataLoaded }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (file) => {
    setIsLoading(true);
    try {
      const parsedData = await parseExcelFile(file);
      
      if (!parsedData.sheetNames || parsedData.sheetNames.length === 0) {
        throw new Error('No data found in the uploaded file');
      }
      
      let hasData = false;
      for (const sheetName of parsedData.sheetNames) {
        if (parsedData.sheets[sheetName]?.data?.length > 0) {
          hasData = true;
          break;
        }
      }
      
      if (!hasData) {
        throw new Error('The uploaded file contains no data rows');
      }
      
      toast.success('File uploaded successfully', {
        description: `Loaded ${parsedData.sheetNames.length} sheet(s) with data`
      });
      
      onDataLoaded(parsedData);
    } catch (error) {
      toast.error('Failed to parse file', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemoData = async () => {
    setIsLoading(true);
    
    // Generate demo data
    const demoData = {
      fileName: 'Demo Sales Data.xlsx',
      sheetNames: ['Sales'],
      metadata: {
        totalSheets: 1,
        uploadedAt: new Date().toISOString()
      },
      sheets: {
        Sales: {
          headers: ['Date', 'Region', 'Product', 'Category', 'Sales', 'Quantity', 'Profit'],
          rows: [],
          data: [],
          totalRows: 100,
          columns: [
            { name: 'Date', type: 'date', uniqueValues: null, hasNulls: false },
            { name: 'Region', type: 'category', uniqueValues: ['North', 'South', 'East', 'West'], hasNulls: false },
            { name: 'Product', type: 'category', uniqueValues: ['Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Tool Z'], hasNulls: false },
            { name: 'Category', type: 'category', uniqueValues: ['Electronics', 'Hardware', 'Software'], hasNulls: false },
            { name: 'Sales', type: 'numeric', uniqueValues: null, hasNulls: false },
            { name: 'Quantity', type: 'numeric', uniqueValues: null, hasNulls: false },
            { name: 'Profit', type: 'numeric', uniqueValues: null, hasNulls: false }
          ]
        }
      }
    };

    const regions = ['North', 'South', 'East', 'West'];
    const products = ['Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Tool Z'];
    const categories = ['Electronics', 'Hardware', 'Software'];
    
    for (let i = 0; i < 100; i++) {
      const date = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const row = {
        Date: date.toISOString().split('T')[0],
        Region: regions[Math.floor(Math.random() * regions.length)],
        Product: products[Math.floor(Math.random() * products.length)],
        Category: categories[Math.floor(Math.random() * categories.length)],
        Sales: Math.floor(Math.random() * 10000) + 500,
        Quantity: Math.floor(Math.random() * 100) + 1,
        Profit: Math.floor(Math.random() * 3000) + 100
      };
      demoData.sheets.Sales.data.push(row);
      demoData.sheets.Sales.rows.push(Object.values(row));
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.success('Demo data loaded', {
      description: '100 sample sales records ready to explore'
    });
    
    setIsLoading(false);
    onDataLoaded(demoData);
  };

  return (
    <div data-testid="landing-page" className="min-h-screen bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] grayscale bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1589628893686-70e3080c8e53?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMG1pbmltYWxpc3QlMjB3aGl0ZSUyMGdlb21ldHJpYyUyMHNoYXBlcyUyMHN3aXNzJTIwZGVzaWdufGVufDB8fHx8MTc3MzIzMTQzMnww&ixlib=rb-4.1.0&q=85')"
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="px-6 py-4 border-b border-zinc-100 bg-white/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading text-xl font-bold text-zinc-900">ExcelViz</span>
            </div>
            <Button 
              data-testid="load-demo-btn"
              variant="outline" 
              onClick={loadDemoData}
              disabled={isLoading}
            >
              Load Demo Data
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-6 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 tracking-tight">
              Unlock Your Excel Data
            </h1>
            <p className="text-base md:text-lg text-zinc-600 max-w-2xl mx-auto">
              Instant visualization. No signup required. Purely client-side processing means your data never leaves your browser.
            </p>
          </div>
        </section>

        {/* Upload Zone */}
        <section className="px-6 pb-24">
          <UploadZone onFileUpload={handleFileUpload} isLoading={isLoading} />
        </section>

        {/* Features Grid */}
        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, idx) => (
                <div 
                  key={idx}
                  data-testid={`feature-card-${idx}`}
                  className="p-6 bg-white border border-zinc-200 rounded-lg hover:shadow-md transition-all duration-200 hover:border-zinc-300"
                >
                  <div className="p-3 bg-zinc-50 rounded-lg w-fit mb-4">
                    <feature.icon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-zinc-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-zinc-100">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-sm text-zinc-400">
              Your data is processed entirely in your browser. Nothing is uploaded to any server.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
