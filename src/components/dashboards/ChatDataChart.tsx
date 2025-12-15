import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Table } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChartType = "bar" | "line" | "pie" | "table";

interface ChatDataChartProps {
  data: any[];
  suggestedType: ChartType;
  className?: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ChatDataChart({ data, suggestedType, className }: ChatDataChartProps) {
  const [chartType, setChartType] = useState<ChartType>(suggestedType);

  if (!data || data.length === 0) return null;

  // Extract keys from data for chart axes
  const keys = Object.keys(data[0] || {});
  const labelKey = keys[0]; // First column as label/category
  const valueKeys = keys.slice(1); // Rest as values

  // Clean data - convert numeric strings and handle special characters
  const cleanedData = data.map((row) => {
    const cleaned: Record<string, any> = {};
    keys.forEach((key) => {
      // Remove brackets from key names for display
      const cleanKey = key.replace(/^\[|\]$/g, "");
      const value = row[key];
      // Try to parse numeric values
      if (typeof value === "string" && !isNaN(parseFloat(value))) {
        cleaned[cleanKey] = parseFloat(value);
      } else {
        cleaned[cleanKey] = value;
      }
    });
    return cleaned;
  });

  const cleanLabelKey = labelKey.replace(/^\[|\]$/g, "");
  const cleanValueKeys = valueKeys.map((k) => k.replace(/^\[|\]$/g, ""));

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cleanedData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey={cleanLabelKey} 
                tick={{ fontSize: 10 }} 
                angle={-45} 
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }} 
              />
              {cleanValueKeys.map((key, idx) => (
                <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cleanedData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey={cleanLabelKey} 
                tick={{ fontSize: 10 }} 
                angle={-45} 
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }} 
              />
              {cleanValueKeys.map((key, idx) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        // For pie chart, use first value key
        const pieData = cleanedData.map((item, idx) => ({
          name: item[cleanLabelKey],
          value: item[cleanValueKeys[0]] || 0,
        }));
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={{ strokeWidth: 1 }}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px"
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case "table":
      default:
        return (
          <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  {keys.map((key) => (
                    <th key={key} className="px-2 py-1 text-left font-medium">
                      {key.replace(/^\[|\]$/g, "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cleanedData.slice(0, 20).map((row, idx) => (
                  <tr key={idx} className="border-b border-muted">
                    {Object.values(row).map((val, colIdx) => (
                      <td key={colIdx} className="px-2 py-1">
                        {typeof val === "number" ? val.toLocaleString("pt-BR") : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <div className={cn("mt-2", className)}>
      {/* Chart type selector */}
      <div className="flex gap-1 mb-2">
        <Button
          variant={chartType === "bar" ? "default" : "ghost"}
          size="sm"
          className="h-6 px-2"
          onClick={() => setChartType("bar")}
        >
          <BarChart3 className="h-3 w-3" />
        </Button>
        <Button
          variant={chartType === "line" ? "default" : "ghost"}
          size="sm"
          className="h-6 px-2"
          onClick={() => setChartType("line")}
        >
          <LineChartIcon className="h-3 w-3" />
        </Button>
        <Button
          variant={chartType === "pie" ? "default" : "ghost"}
          size="sm"
          className="h-6 px-2"
          onClick={() => setChartType("pie")}
        >
          <PieChartIcon className="h-3 w-3" />
        </Button>
        <Button
          variant={chartType === "table" ? "default" : "ghost"}
          size="sm"
          className="h-6 px-2"
          onClick={() => setChartType("table")}
        >
          <Table className="h-3 w-3" />
        </Button>
      </div>

      {/* Chart */}
      <div className="bg-background/50 rounded-lg p-2">
        {renderChart()}
      </div>
    </div>
  );
}
