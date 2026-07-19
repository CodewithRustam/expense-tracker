import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexFill,
  ApexPlotOptions,
  ApexYAxis,
  ApexGrid,
  ApexLegend,
  ApexStroke,
  ApexMarkers
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  fill: ApexFill;
  plotOptions: ApexPlotOptions;
  colors: string[];
  grid: ApexGrid;
  legend: ApexLegend;
  stroke: ApexStroke;
  markers: ApexMarkers;
};

export const getBaseTrendChartOptions = (): ChartOptions => {
  return {
    series: [],
    chart: {
      type: 'area',
      height: 215,
      toolbar: { show: false },
      sparkline: { enabled: false },
      animations: {
        enabled: true,
        speed: 800,
        animateGradually: { enabled: true, delay: 100 }
      },
      fontFamily: "'Poppins', sans-serif"
    },
    plotOptions: {},
    dataLabels: {
      enabled: true,
      formatter: (val: number) => {
        return '₹' + val.toLocaleString('en-IN');
      },
      offsetY: -10,
      style: {
        fontSize: '10px',
        fontWeight: '600',
        colors: ['#a5b4fc']
      },
      background: {
        enabled: false
      }
    },
    legend: { show: false },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors: ['#6366f1']
    },
    markers: {
      size: 4,
      colors: ['#ffffff'],
      strokeColors: ['#6366f1'],
      strokeWidth: 2,
      hover: { size: 6 }
    },
    colors: ['#6366f1'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        type: 'vertical',
        colorStops: [
          { offset: 0, color: '#6366f1', opacity: 0.35 },
          { offset: 60, color: '#818cf8', opacity: 0.1 },
          { offset: 100, color: '#c7d2fe', opacity: 0 }
        ]
      }
    },
    xaxis: {
      categories: [],
      labels: {
        style: { colors: '#9797ab', fontSize: '11px', fontWeight: 500 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      show: true,
      labels: {
        style: { colors: '#9797ab', fontSize: '10px' },
        formatter: (val: number) => val >= 1000 ? '₹' + (val / 1000).toFixed(1) + 'k' : '₹' + val
      }
    },
    grid: {
      show: true,
      borderColor: 'rgba(151,151,171,0.12)',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 4, right: 8, top: 0, bottom: 0 }
    },
    tooltip: {
      theme: 'dark',
      x: { show: true },
      y: { formatter: (val: number) => `₹${val.toLocaleString('en-IN')}` }
    }
  };
};

export type DonutChartOptions = {
  series: import('ng-apexcharts').ApexNonAxisChartSeries;
  chart: import('ng-apexcharts').ApexChart;
  labels: string[];
  colors: string[];
  dataLabels: import('ng-apexcharts').ApexDataLabels;
  plotOptions: import('ng-apexcharts').ApexPlotOptions;
  responsive: import('ng-apexcharts').ApexResponsive[];
  legend: import('ng-apexcharts').ApexLegend;
};

export const getDonutChartOptions = (isDark: boolean): DonutChartOptions => {
  const textColor = isDark ? '#f2f2f7' : '#17172b';

  return {
    series: [],
    colors: ['#6366f1', '#818cf8', '#a5b4fc', '#4f46e5', '#c7d2fe', '#3730a3', '#e0e7ff'],
    chart: { type: 'donut', height: 260, background: 'transparent', animations: { enabled: true, speed: 400 }, fontFamily: "'Poppins', sans-serif" },
    labels: [],
    dataLabels: {
      enabled: true,
      formatter: (val: any) => val.toFixed(0) + '%',
      style: { fontSize: '11px', fontFamily: 'Poppins, sans-serif', fontWeight: '600', colors: ['#fff'] },
      dropShadow: { enabled: false }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '62%',
          labels: {
            show: true,
            name: { color: textColor, fontSize: '12px', fontWeight: 500 },
            value: {
              color: textColor, fontSize: '18px', fontWeight: 600,
              formatter: (val: string) => `₹${Number(val).toLocaleString()}`
            },
            total: {
              show: true, label: 'Total', color: textColor,
              formatter: (w: any) => {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return `₹${total.toLocaleString()}`;
              }
            }
          }
        }
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      labels: { colors: textColor },
      fontFamily: 'Poppins, sans-serif',
      fontSize: '12px',
      markers: { radius: 4 } as any,
      itemMargin: { horizontal: 8, vertical: 4 }
    },
    responsive: [{ breakpoint: 480, options: { chart: { height: 240 } } }]
  };
};
