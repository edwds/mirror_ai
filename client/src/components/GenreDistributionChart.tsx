import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GenreDistributionProps {
  data: { name: string; count: number }[];
  title: string;
  loading?: boolean;
}

const COLORS = [
  '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', 
  '#1abc9c', '#d35400', '#34495e', '#c0392b', '#16a085'
];

const GenreDistributionChart: React.FC<GenreDistributionProps> = ({ 
  data, 
  title,
  loading = false 
}) => {
  // 데이터 정렬 (개수 기준 내림차순)
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  
  // 데이터가 10개를 초과하는 경우, 상위 9개만 보여주고 나머지는 "기타"로 통합
  const chartData = sortedData.length > 10 
    ? [
        ...sortedData.slice(0, 9),
        {
          name: '기타',
          count: sortedData.slice(9).reduce((acc, curr) => acc + curr.count, 0)
        }
      ]
    : sortedData;

  const renderCustomizedLabel = ({ 
    cx, cy, midAngle, innerRadius, outerRadius, percent, index 
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent >= 0.05 ? (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontWeight: 'bold', fontSize: '12px' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [`${value}개`, props.payload.name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default GenreDistributionChart;