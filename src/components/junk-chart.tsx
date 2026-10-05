import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CategoryScan } from "@/lib/api";

const chartConfig = {
  sizeMB: { label: "Size (MB)", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function JunkChart({ categories }: { categories: CategoryScan[] }) {
  const data = categories.map((c) => ({
    name: c.name.replace(" Files", ""),
    sizeMB: +(c.size_bytes / 1024 / 1024).toFixed(1),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Junk breakdown</CardTitle>
        <CardDescription>Size per category, in MB</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="sizeMB" fill="var(--color-sizeMB)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
