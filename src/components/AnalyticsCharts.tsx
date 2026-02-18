import React from 'react';
import { formatCurrency } from '../utils/format';
// useLanguage is not used in AnalyticsCharts, removing it
// import { useLanguage } from '../context/LanguageContext';

// --- Types ---
export interface MonthlyData {
    month: string; // "Jan", "Feb", etc.
    income: number;
    expense: number;
}

export interface CategoryData {
    category: string;
    amount: number;
    color: string;
    percentage: number;
}

// --- Props ---
interface BarChartProps {
    data: MonthlyData[];
}

interface PieChartProps {
    data: CategoryData[];
}

// --- Bar Chart Component ---
export const BarChart: React.FC<BarChartProps> = ({ data }) => {
    // Dimensions
    const width = 100;
    const height = 60;
    const padding = 10;
    const barWidth = 6;
    const gap = 4;

    // Scales
    const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expense)), 100);
    const scaleY = (value: number) => (value / maxValue) * (height - padding * 2);

    return (
        <div className="chart-container monitor-screen">
            <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
                {/* Grid Lines */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />

                {data.map((d, i) => {
                    const x = padding + i * (barWidth * 2 + gap);
                    const incomeH = scaleY(d.income);
                    const expenseH = scaleY(d.expense);

                    return (
                        <g key={i} className="bar-group">
                            {/* Income Bar */}
                            <foreignObject x={x} y={height - padding - incomeH} width={barWidth} height={incomeH} className="bar-fo">
                                <div className="bar income-bar" style={{ height: '100%' }} title={`Income: ${formatCurrency(d.income)}`} />
                            </foreignObject>

                            {/* Expense Bar */}
                            <foreignObject x={x + barWidth} y={height - padding - expenseH} width={barWidth} height={expenseH} className="bar-fo">
                                <div className="bar expense-bar" style={{ height: '100%' }} title={`Expense: ${formatCurrency(d.expense)}`} />
                            </foreignObject>

                            {/* Label */}
                            <text x={x + barWidth} y={height - 2} fontSize="3" fill="var(--color-text-secondary)" textAnchor="middle">{d.month}</text>
                        </g>
                    );
                })}
            </svg>
            <div className="chart-legend">
                <div className="legend-item"><span className="dot income"></span> Income</div>
                <div className="legend-item"><span className="dot expense"></span> Expense</div>
            </div>
        </div>
    );
};

// --- Pie Chart Component ---
export const PieChart: React.FC<PieChartProps> = ({ data }) => {
    const size = 100;
    const center = size / 2;
    const radius = size / 2 - 10;

    // Handle empty data
    if (data.length === 0 || data.every(d => d.amount === 0)) {
        return (
            <div className="chart-container glass-panel empty-chart">
                <p>No data available</p>
            </div>
        );
    }



    // Alternative: Simple loop
    const generatedSlices = [];
    let currentAngle = 0;
    for (const d of data) {
        const angle = (d.percentage / 100) * 360;
        const x1 = center + radius * Math.cos(Math.PI * currentAngle / 180);
        const y1 = center + radius * Math.sin(Math.PI * currentAngle / 180);
        const x2 = center + radius * Math.cos(Math.PI * (currentAngle + angle) / 180);
        const y2 = center + radius * Math.sin(Math.PI * (currentAngle + angle) / 180);

        const largeArc = angle > 180 ? 1 : 0;
        const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

        generatedSlices.push({ ...d, pathData });
        currentAngle += angle;
    }

    return (
        <div className="chart-container glass-panel">
            <div className="pie-chart-wrapper">
                <svg viewBox={`0 0 ${size} ${size}`} className="chart-svg pie">
                    {generatedSlices.map((d, i) => (
                        <path
                            key={i}
                            d={d.pathData}
                            fill={d.color}
                            className="pie-slice"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="0.5"
                        >
                            <title>{`${d.category}: ${formatCurrency(d.amount)} (${d.percentage.toFixed(1)}%)`}</title>
                        </path>
                    ))}
                    {/* Inner Circle for Donut Chart effect */}
                    <circle cx={center} cy={center} r={radius * 0.6} fill="var(--color-bg-card-glass)" />
                </svg>
            </div>
            <div className="chart-legend vertical">
                {data.map((d, i) => (
                    <div key={i} className="legend-item">
                        <span className="dot" style={{ backgroundColor: d.color }}></span>
                        <span className="legend-text">{d.category}</span>
                        <span className="legend-value">{d.percentage.toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
