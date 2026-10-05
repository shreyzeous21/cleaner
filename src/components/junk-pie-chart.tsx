import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CategoryScan } from "@/lib/api";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function JunkPieChart({ categories }: { categories: CategoryScan[] }) {
  const config: ChartConfig = {};
  const data = categories.map((c, i) => {
    config[c.id] = { label: c.name, color: COLORS[i % COLORS.length] };
    return {
      name: c.id,
      label: c.name,
      value: +(c.size_bytes / 1024 / 1024).toFixed(1),
      fill: COLORS[i % COLORS.length],
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Space share</CardTitle>
        <CardDescription>Which categories take up the most space</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="mx-auto h-64 max-w-xs">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
