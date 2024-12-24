<template>
  <div>
    <input type="text" v-model="regexInput" placeholder="输入正则表达式" />
    <button
      class="badge badge-info hover:badge-outline cursor-pointer select-none"
      @click="updateChart"
    >
      更新图表
    </button>
    <canvas ref="lineChart"></canvas>
  </div>
</template>

<script>
// 导入 VueUse 中的 refThrottled 和 useScroll 工具函数
import { refThrottled, useScroll } from "@vueuse/core";
import { format } from "date-fns";
import {
  defineComponent,
  ref,
  watch,
  inject,
  onMounted,
  nextTick,
  defineExpose,
  provide,
  computed,
  onBeforeUnmount,
} from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  LineController,
} from "chart.js";
import { useRecordStore } from "@/store/useRecordStore";
// 导入 useDataCode 工具函数，用于数据编码转换
import { useDataCode } from "@/utils/useDataCode/useDataCode";
const { records, readingRecord, addRecord } = useRecordStore();
// 从 useDataCode 工具函数中解构出 bufferToDecFormat, bufferToHexFormat, bufferToString, stringToHtml 函数
const { bufferToDecFormat, bufferToHexFormat, bufferToString, stringToHtml } =
  useDataCode();

// 注册需要的 Chart.js 组件
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  LineController
);
export default defineComponent({
  name: "LineChart",
  setup() {
    const regexInput = ref("imu .*?angle.*? ([+-]?\\d+\\.\\d+) .*?"); // 用于存储正则表达式的输入
    const lineChart = ref(null); // 图表 canvas 元素
    const chartInstance = ref(null); // 图表实例
    // 从父组件 RecordStore 获取 records 数据
    // const records = inject("records");

    // 解析 records 数据，提取横纵坐标数据
    const parseRecords = () => {
      const labels = []; // 存储时间（横坐标）
      const data = []; // 存储数据（纵坐标）

      // 从 records 中提取 time 和 data
      records.value.map((record) => {
        // 只处理 type 为 'read' 的记录
        if (record.type == "read") {
          if (record.display == "ascii") {
            let match = bufferToString(record.data).match(new RegExp(regexInput.value));
            if (match) {
              labels.push(format(record.time, "HH:mm:ss.SSS"));
              data.push(Number(match[1]));
            }
          }
        }
      });

      return { labels, data };
    };

    // 创建图表实例
    const createChart = () => {
      const { labels, data } = parseRecords();

      const chartData = {
        labels: labels,
        datasets: [
          {
            label: "Data", // 图表数据标签
            data: data, // 数据
            borderColor: "#42A5F5", // 折线颜色
            fill: false, // 不填充背景
            tension: 0.4, // 曲线平滑度
            borderWidth: 2, // 边框宽度
          },
        ],
      };

      const chartOptions = {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Line Chart Example", // 图表标题
          },
          tooltip: {
            mode: "index", // 工具提示
            intersect: false,
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Time", // x 轴标题
            },
          },
          y: {
            title: {
              display: true,
              text: "Data", // y 轴标题
            },
            beginAtZero: true, // y 轴从 0 开始
          },
        },
        layout: {
          padding: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10,
          },
        },
      };

      // 使用 Chart.js 创建图表
      chartInstance.value = new ChartJS(lineChart.value, {
        type: "line",
        data: chartData,
        options: chartOptions,
      });
    };

    // 更新图表数据
    const updateChart = () => {
      const { labels, data } = parseRecords();

      if (chartInstance.value) {
        chartInstance.value.data.labels = labels;
        chartInstance.value.data.datasets[0].data = data;
        chartInstance.value.update();
        // chartInstance.value.destroy();
      }
      createChart();
    };

    // 计算属性 recordLength，返回 records 数组的长度
    const recordLength = computed(() => records.value.length);

    // 监听 recordLength 和 readingRecord 的变化
    // watch(
    //   [recordLength, refThrottled(readingRecord, 200)], // 使用 refThrottled 对 readingRecord 进行节流，每150ms触发一次
    //   (value, oldValue) => {
    //     updateChart();
    //   },
    //   { deep: true } // 深度监听，确保能够监听到对象内部属性的变化
    //   // { immediate: true }
    // );

    // // 在组件挂载时创建图表
    // onMounted(() => {
    //   nextTick(() => {
    //     createChart();
    //   });
    // });
    // 在组件销毁前清除图表实例引用
    onBeforeUnmount(() => {
      if (chartInstance.value) {
        chartInstance.value.destroy(); // 销毁图表实例
      }
      chartInstance.value = null;
      createChart();
    });
    // // 暴露 updateChart 方法，以便在外部调用
    // defineExpose({
    //   updateChart,
    // });

    return {
      lineChart, // 返回 ref 供模板中引用
      updateChart,
      regexInput,
    };
  },
});
</script>

<style scoped>
canvas {
  background-color: rgb(217, 232, 227);
  width: 80%;
  height: 400px;
  margin:0 auto;
  display: block;
}
input {
  margin-left: 10px;
  width:500px;
}
</style>
