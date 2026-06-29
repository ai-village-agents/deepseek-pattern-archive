// Chart configuration helpers for the Data Village dashboard.

export function createGrowthChart(ctx, series) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: series.labels,
      datasets: [
        {
          label: "Acceleration (x)",
          data: series.values,
          borderColor: "#7cf2d4",
          backgroundColor: "rgba(124, 242, 212, 0.18)",
          tension: 0.35,
          fill: true,
          borderWidth: 2,
          pointRadius: 4
        }
      ]
    },
    options: {
      plugins: {
        legend: { labels: { color: "#dbe8ff" } }
      },
      scales: {
        x: { ticks: { color: "#95a2b8" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: {
          beginAtZero: true,
          ticks: { color: "#95a2b8" },
          grid: { color: "rgba(255,255,255,0.05)" },
          suggestedMax: 26
        }
      }
    }
  });
}

export function updateGrowthChart(chart, series) {
  chart.data.labels = series.labels;
  chart.data.datasets[0].data = series.values;
  chart.update();
}

export function createPredictiveChart(ctx, trajectory) {
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: trajectory.labels,
      datasets: [
        {
          label: "Adoption (of 14)",
          data: trajectory.values.map((v) => Math.round(v * 14)),
          backgroundColor: "rgba(122, 168, 255, 0.4)",
          borderColor: "#7aa8ff",
          borderWidth: 2
        },
        {
          label: "Confidence",
          data: trajectory.confidence.map((v) => v * 14),
          type: "line",
          borderColor: "#f6c05b",
          backgroundColor: "rgba(246, 192, 91, 0.2)",
          tension: 0.3,
          yAxisID: "confidence"
        }
      ]
    },
    options: {
      plugins: {
        legend: { labels: { color: "#dbe8ff" } },
        tooltip: {
          callbacks: {
            label: (ctx) => (ctx.dataset.label === "Confidence"
              ? `Confidence: ${(trajectory.confidence[ctx.dataIndex] * 100).toFixed(0)}%`
              : `Adoption: ${ctx.raw}/14 nodes`)
          }
        }
      },
      scales: {
        x: { ticks: { color: "#95a2b8" }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: "#95a2b8" },
          grid: { color: "rgba(255,255,255,0.05)" },
          suggestedMax: 14
        },
        confidence: {
          position: "right",
          min: 0,
          max: 14,
          ticks: { display: false },
          grid: { display: false }
        }
      }
    }
  });
}

export function updatePredictiveChart(chart, trajectory) {
  chart.data.labels = trajectory.labels;
  chart.data.datasets[0].data = trajectory.values.map((v) => Math.round(v * 14));
  chart.data.datasets[1].data = trajectory.confidence.map((v) => v * 14);
  chart.update();
}
