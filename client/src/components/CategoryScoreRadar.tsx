import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryScoreData {
  composition: { score: number; count: number }[];
  lighting: { score: number; count: number }[];
  color: { score: number; count: number }[];
  focus: { score: number; count: number }[];
  creativity: { score: number; count: number }[];
}

interface CategoryScoreRadarProps {
  data: CategoryScoreData;
  title: string;
  loading?: boolean;
}

const CategoryScoreRadar: React.FC<CategoryScoreRadarProps> = ({ 
  data, 
  title,
  loading = false
}) => {
  // 각 카테고리별 평균 점수 계산
  const calculateAverage = (scoreData: { score: number; count: number }[]) => {
    const totalScore = scoreData.reduce((acc, curr) => acc + (curr.score * curr.count), 0);
    const totalCount = scoreData.reduce((acc, curr) => acc + curr.count, 0);
    return totalCount > 0 ? Math.round(totalScore / totalCount) : 0;
  };

  // 평균을 구해 레이더 차트 데이터 형식으로 변환
  const radarData = [
    {
      category: "카테고리별 평균 점수",
      "구도": calculateAverage(data.composition),
      "조명": calculateAverage(data.lighting),
      "색상": calculateAverage(data.color),
      "초점": calculateAverage(data.focus),
      "창의성": calculateAverage(data.creativity),
      fullMark: 100
    }
  ];

  // 각 카테고리의 평균 점수가 0이 아닌 경우만 레이더 차트에 표시
  const categories = [
    { key: "구도", dataKey: "구도", enabled: calculateAverage(data.composition) > 0 },
    { key: "조명", dataKey: "조명", enabled: calculateAverage(data.lighting) > 0 },
    { key: "색상", dataKey: "색상", enabled: calculateAverage(data.color) > 0 },
    { key: "초점", dataKey: "초점", enabled: calculateAverage(data.focus) > 0 },
    { key: "창의성", dataKey: "창의성", enabled: calculateAverage(data.creativity) > 0 }
  ].filter(cat => cat.enabled);

  // 모든 카테고리의 평균 점수 표시
  const categoriesWithAvg = categories.map(cat => ({
    ...cat,
    name: `${cat.key} (평균: ${radarData[0][cat.dataKey as keyof typeof radarData[0]]}점)`
  }));

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
            <RadarChart 
              cx="50%" 
              cy="50%" 
              outerRadius="80%" 
              data={radarData}
            >
              <PolarGrid />
              <PolarAngleAxis 
                dataKey="category" 
                tick={false} 
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
              />
              <Tooltip 
                formatter={(value, name) => [`${value}점`, name]}
              />
              {categoriesWithAvg.map((cat, index) => (
                <Radar
                  key={cat.key}
                  name={cat.name}
                  dataKey={cat.dataKey}
                  stroke={`hsl(${index * 70}, 70%, 50%)`}
                  fill={`hsl(${index * 70}, 70%, 50%)`}
                  fillOpacity={0.3}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryScoreRadar;