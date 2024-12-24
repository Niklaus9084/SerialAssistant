let dataChart;
//事件侦听
let importRegexFile = document.getElementById("importregex");
if (importRegexFile) {
  importRegexFile.addEventListener("change", function () {
    importRegex();
  });
}
document.getElementById("fileInput").addEventListener("change", function () {
  readFile();
});
document.getElementById("readFile").addEventListener("click", function () {
  readFile();
});

// ClipboardJS for copying table data
document
  .getElementById("copy-button")
  .addEventListener("click", async function () {
    try {
      let tableElement = document.getElementById("data_table");
      if (tableElement) {
        let data = tableDateToArray(tableElement);
        let excelFormatText = convertArrayToExcelFormat(data);
        await navigator.clipboard.writeText(excelFormatText);
        alert("二维数组已成功复制到剪贴板，可直接粘贴到Excel中！");
      } else {
        alert("未找到表格！");
      }
    } catch (error) {
      alert("复制二维数组到剪贴板时出错：" + error.message);
    }
  });

document.getElementById("generateChart").addEventListener("click", function () {
  let tableElement = document.querySelector("#tablesContainer #data_table");
  if (tableElement) {
    let array = tableDateToArray(tableElement);
    let chartData = getDataFromArray(array);
    createChart(chartData);
  }
});
//添加generate Water动作
document.getElementById("generateWater").addEventListener("click", function () {
  let tableElement = document.querySelector("#tablesContainer #data_table");
  if (tableElement) {
    let array = tableDateToArray(tableElement);
    // let chartData = getDataFromArray(array);
    // createWaterChart(array);
    createWaterLineChart(array);
  }
});

// Export the chart as an image
document
  .getElementById("exportButtonChart")
  .addEventListener("click", function () {
    const imageLink = document.createElement("a");
    imageLink.href = dataChart.toBase64Image();
    imageLink.download = "chart.png";
    imageLink.click();
  });

// 为canvas元素添加鼠标移动事件监听器，实现滑动线移动和值显示功能
let canvas = document.getElementById("dataChart");
if (canvas) {
  canvas.addEventListener("click", function (event) {
    chartMouseMoveAction(dataChart, event);
  });
}
//处理函数
//正则表达式导入
function importRegex() {
  const file = document.getElementById("importregex").files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const csvData = e.target.result;
      const lines = csvData.split("\n");
      const table = document.getElementById("Regex Table");
      const tbody = table.getElementsByTagName("tbody")[0];

      // 清空现有表格数据（除了表头）
      while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
      }

      rowIndex = 1;

      for (let i = 1; i < lines.length; i++) {
        if (lines[i]) {
          const cells = lines[i].split(",");
          const row = document.createElement("tr");
          const indexCell = document.createElement("td");
          const paramCell = document.createElement("td");
          const regexCell = document.createElement("td");

          indexCell.textContent = rowIndex++;
          paramCell.textContent = cells[1];
          regexCell.textContent = cells[2].replace(/\\/g, "\\");

          row.appendChild(indexCell);
          row.appendChild(paramCell);
          row.appendChild(regexCell);

          tbody.appendChild(row);
        }
      }
    };
    reader.readAsText(file);
  }
}

//读取数据
// datacontent = [
//     {
//         timestamp:,
//         param:,
//         value:
//     },
// ]
function readFile() {
  const regextable = document.getElementById("Regex Table");
  const regexrows = regextable.getElementsByTagName("tr");
  let regexConfig = [];
  let datacontent = [];

  for (let i = 1; i < regexrows.length; i++) {
    const cells = regexrows[i].getElementsByTagName("td");
    regexConfig.push({
      param: cells[1].textContent,
      regex: cells[2].textContent,
    });
  }

  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a file");
    return;
  }
  const timesttampregex = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/;
  const reader = new FileReader();
  reader.readAsText(file);
  //reader回调函数
  let processedData = [];
  reader.onload = function (event) {
    const text = event.target.result;
    const lines = text.split("\n");
    for (let i = 0; i < lines.length - 1; i++) {
      current_line = lines[i];
      next_line = lines[i + 1];

      regexConfig.forEach((config) => {
        let row = {};
        const timestampmatch = current_line.match(new RegExp(timesttampregex));
        if (timestampmatch) {
          row["timestamp"] = new Date(timestampmatch[1].replace(" ", "T"));
          const valuematch = next_line.match(new RegExp(config.regex));
          if (valuematch) {
            row["param"] = config.param;
            row["value"] = valuematch[1];
            datacontent.push(row);
          }
        }
      });
    }
    processedData = processData(datacontent);
    let tableContainer = document.getElementById("tablesContainer");
    if (tableContainer) {
      extractedData(processedData, tableContainer);
    }
  };
  return processedData;
}
//整理数据
// processData=[
//     {
//         timestamp:,
//         param1:,
//         param2:,
//         ...
//     },
// ]
function processData(data) {
  let processedData = [];

  data.sort((a, b) => {
    let dateA = a["timestamp"];
    let dateB = b["timestamp"];

    return dateA - dateB;
  });

  // 提取唯一参数名
  let uniqueParamNames = new Set();
  data.forEach((row) => {
    uniqueParamNames.add(row["param"]);
  });
  // if (['water pump current', 'battery volate'].every(param => uniqueParamNames.has(param))){
  //     uniqueParamNames.add('water pump power');
  // }

  // 数据分组与匹配
  for (let i = 0; i < data.length; i++) {
    let time = data[i]["timestamp"];
    let paramName = data[i]["param"];
    let value = data[i]["value"];
    let combinedData = {
      timestamp: time,
    };
    combinedData[paramName] = value;
    //从下一行开始搜索与当前行不同的参数，且时间在4s内
    for (let j = i + 1; j < data.length; j++) {
      i = j;
      //获取参数指令发送时间间隔1S，数据发送接收时间间隔100ms以内，连续发送的两行数据时间间隔不会大于2s
      let timeDiff =
        (Date.parse(data[j]["timestamp"]) -
          Date.parse(data[j - 1]["timestamp"])) /
        1000;
      if (timeDiff > 2) {
        break;
      }
      let nextRow = data[j];
      let nextParamName = nextRow["param"];
      let nextValue = nextRow["value"];
      if (nextParamName == paramName) {
        break;
      } else {
        combinedData[nextParamName] = nextValue;
      }
    }
    // if (['water pump current', 'battery volate'].every(param => Object.keys(combinedData).includes(param))){
    //     combinedData['water pump power'] = combinedData['water pump current'] * combinedData['battery volate'];
    // };
    processedData.push(combinedData);
  }
  return processedData;
}
/**
 * 函数：将提取的数据动态生成表格并添加到指定的容器中
 * 参数：
 * - data：包含数据的数组
 * - tableContainer：表格将被添加到的容器的 ID
 * 返回值：无
 */
function extractedData(data, tableContainer) {
  // 用于存储所有参数名的数组
  let paramNames = [];
  // 遍历数据数组，提取每个对象的键（即参数名）并添加到 paramNames 数组中
  data.forEach((row) => {
    paramNames = paramNames.concat(Object.keys(row));
  });

  // 使用 filter() 方法去除重复的参数名，得到一个唯一的参数名数组
  var uniqueParamsArray = paramNames.filter(function (element, index, self) {
    return self.indexOf(element) === index;
  });

  // 如果表格容器存在
  if (tableContainer) {
    // 清空表格容器的内容
    tableContainer.innerHTML = "";

    // 创建一个新的 <div> 元素，用来包裹表格和表格标题
    const tableWrapper = document.createElement("div");

    // 创建表格元素，并设置其 ID
    const tableElement = document.createElement("table");
    tableElement.id = "data_table";

    // 创建表格头部（thead）
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // 遍历唯一参数名数组，为每个参数名创建一个表格头部单元格（th）
    uniqueParamsArray.forEach((param) => {
      const th = document.createElement("th");
      th.textContent = param;
      headerRow.appendChild(th);
    });

    // 检查是否存在 'water pump power' 参数，如果不存在且存在 'water pump current' 和 'battery volate'，则添加 'water pump power' 参数
    if (!uniqueParamsArray.includes("water pump power")) {
      if (
        ["water pump current", "battery volate"].every((param) =>
          uniqueParamsArray.includes(param)
        )
      ) {
        uniqueParamsArray.push("water pump power");
        const th = document.createElement("th");
        th.textContent = "water pump power";
        headerRow.appendChild(th);
      }
    }

    // 将表头行添加到表格头部
    thead.appendChild(headerRow);
    // 将表格头部添加到表格元素
    tableElement.appendChild(thead);

    // 创建表格主体（tbody）
    const tbodyElement = document.createElement("tbody");

    // 遍历数据数组，为每个数据项创建一行表格数据
    data.forEach((item) => {
      const row = document.createElement("tr");
      // 获取当前数据项的所有键
      itemKeys = Object.keys(item);
      // 遍历唯一参数名数组，为每个参数名创建一个表格单元格（td）
      uniqueParamsArray.forEach((param) => {
        const cell = document.createElement("td");
        // 如果当前参数名存在于数据项的键中，则将其值添加到单元格中
        if (itemKeys.includes(param)) {
          if (param == "timestamp") {
            // 将时间戳转换为本地字符串格式
            cell.textContent = item[param].toLocaleString();
          } else {
            // 将数值转换为本地字符串格式
            cell.textContent = Number(item[param]).toLocaleString();
          }
          // 如果当前参数名为 'water pump power'，则根据 'water pump current' 和 'battery volate' 的值计算功率
        } else if (param == "water pump power") {
          if (
            ["water pump current", "battery volate"].every((p) =>
              itemKeys.includes(p)
            )
          ) {
            // 计算功率（电流乘以电压，单位为 mA 和 mV，所以除以 1000000）
            cell.textContent =
              (Number(item["water pump current"]) *
                Number(item["battery volate"])) /
              1000000;
          } else {
            // 如果缺少电流或电压值，则显示 'null'
            cell.textContent = "null";
          }
          // 如果当前参数名不存在于数据项中，则显示 'null'
        } else {
          cell.textContent = "null";
        }
        // 将单元格添加到行中
        row.appendChild(cell);
      });
      // 将行添加到表格主体
      tbodyElement.appendChild(row);
    });

    // 将表格主体添加到表格元素
    tableElement.appendChild(tbodyElement);
    // 将表格元素添加到包裹它的 <div> 元素中
    tableWrapper.appendChild(tableElement);

    // 将当前表格的内容添加到页面的容器中
    tableContainer.appendChild(tableWrapper);
  }
}

//数据导出为可复制结构
function convertArrayToExcelFormat(array) {
  let excelFormatText = "";
  for (let i = 0; i < array.length; i++) {
    for (let j = 0; j < array[i].length; j++) {
      excelFormatText += array[i][j].replace(",", "");
      if (j < array[i].length - 1) {
        excelFormatText += "\t";
      }
    }
    if (i < array.length - 1) {
      excelFormatText += "\n";
    }
  }
  return excelFormatText;
}
//获取表格数据并转为数组
/*
          Array = [
              [timestamp,param1,param2...],
              [timevalue,value1,value2...],
              ...
          ]
      */
function tableDateToArray(tableElement) {
  // 获取指定id的表格元素
  var table = tableElement;

  // 获取表格的行数
  var rowCount = table.rows.length;

  // 创建一个空的二维数组，用于存储表格数据
  var tableDataArray = [];

  // 遍历表格的每一行
  for (var i = 0; i < rowCount; i++) {
    var row = table.rows[i];
    // 获取当前行的列数
    var colCount = row.cells.length;
    // 创建一个空数组，用于存储当前行的数据
    var rowDataArray = [];

    // 遍历当前行的每一列
    for (var j = 0; j < colCount; j++) {
      var cell = row.cells[j];
      rowDataArray.push(cell.textContent);
    }

    // 将当前行的数据数组添加到二维数组中
    tableDataArray.push(rowDataArray);
  }
  return tableDataArray;
}

// Create the chart from extracted data
function createChart(chartData) {
  const ctx = document.getElementById("dataChart").getContext("2d");
  // let dataChart = document.getElementById('datachart');
  if (dataChart) {
    dataChart.destroy();
  }
  dataChart = new Chart(ctx, {
    type: "line",
    data: chartData,
    options: CreatChartOptions(),
  });
}
//从数组提取绘图数据
function getDataFromArray(array) {
  let chartData = {
    labels: [],
    datasets: [],
  };
  //数组首行为变量名，其中第一个变量为timestamp
  let paramNames = array[0].slice(1);
  paramNames.forEach((param, i) => {
    chartData.datasets.push({
      label: param,
      data: [],
      borderColor: `rgba(${(i * 103) % 255}, ${(i * 153) % 255}, ${
        (i * 203) % 255
      }, 1)`,
      fill: false,
      pointRadius: 1, // 设置点的半径，即大小
      pointHoverRadius: 3, // 设置鼠标悬停时点的半径
    });
  });
  for (let i = 1; i < array.length; i++) {
    chartData.labels.push(array[i][0].replace(" ", "T"));
    chartData.datasets.forEach((item, j) => {
      //前面去掉了一个timestamp，这里参数名的下标比数值下表小1
      d = array[i][j + 1];
      item.data.push(Number(d.replace(",", "")));
    });
  }
  return chartData;
}
//创建折线图选项
function CreatChartOptions() {
  let options = {
    responsive: true,
    maintainAspectRatio: false,
    hover: {
      mode: "index",
      intersect: false,
    },
    tooltips: {
      mode: "index",
      intersect: true,
    },
    annotation: {
      drawTime: "afterDatasetsDraw",
      annotations: [
        {
          type: "line",
          mode: "vertical",
          // scaleID: 'x-axis-0',
          // value: 'March', // 初始滑动线位置在March对应的横坐标
          borderColor: "gray",
          borderWidth: 2,
          label: {
            enabled: true,
            content: "滑动线位置",
            position: "left",
          },
        },
      ],
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true, // 自动跳过重叠的标签
          maxTicksLimit: 18, // 最多显示 10 个标签
          // 设置倾斜角度，这里设置为45度，可根据需求调整
          maxRotation: 45,
          // 最小倾斜角度，可根据需求设置
          minRotation: 45,
          // 设置字体样式，这里设置为Arial字体，大小为12px，可根据需求调整
          font: {
            family: "Arial",
            size: 12,
          },
        },
      },
      y: {
        beginAtZero: false,
      },
    },
    plugins: {
      zoom: {
        pan: {
          // 启用平移
          enabled: true, // 启用平移
          mode: "xy", // 平移模式，可以设置为 'x'、'y' 或 'xy'
          speed: 20, // 平移速度
          threshold: 10, // 平移的触发阈值
          modifierKey: "ctrl",
        },
        zoom: {
          // 启用缩放
          mode: "xy",
          wheel: {
            enabled: true, // 鼠标滚轮缩放
          },
          drag: {
            enabled: true,
          },
          pitch: {
            enabled: true,
          },
        },
      },
    },
  };
  return options;
}

//图表中鼠标移动显示最近数据
function chartMouseMoveAction(dataChart, event) {
  let canvas = document.getElementById("dataChart");
  var rect = canvas.getBoundingClientRect();
  var x = event.clientX - rect.left;

  // 获取鼠标所在位置最接近的数据点信息
  var meta = dataChart.getElementsAtEventForMode(
    event,
    "nearest",
    { intersect: false },
    false
  );
  if (meta.length > 0 && x > 1) {
    var dataIndex = meta[0].index;
    var label = dataChart.data.labels[dataIndex];

    // 更新滑动线的位置到鼠标所在数据点对应的横坐标
    // 获取图表的annotation配置对象（这里只有一个滑动线的annotation）
    var annotation = dataChart.options.annotation.annotations[0];
    annotation.value = label;
    dataChart.update();

    // 清空之前显示的值
    var valueDisplayDiv = document.getElementById("valueDisplayDiv");
    valueDisplayDiv.innerHTML = "";

    // 显示同横坐标的多条折线的值，并输出到网页上的div元素中
    var datasets = dataChart.data.datasets;
    var p = [{ timestamp: label }];

    for (var i = 0; i < datasets.length; i++) {
      var value = datasets[i].data[dataIndex];
      var k = datasets[i].label;
      var v = value;
      p[0][k] = v;
    }
    extractedData(p, valueDisplayDiv);
  }
}
function createWaterLineChart(array) {
  // 假设array是包含数据点的二维数组，每个数据点是一个包含y和angle的数组
  // 例如：array = [[y1, angle1], [y2, angle2], ...]
  let p_i = 0;
  let d_i = 0;
  for (let i = 1; i < array[0].length; i++) {
    if (array[0][i] == "pitch") {
      p_i = i;
    }
    if (array[0][i] == "depth") {
      d_i = i;
    }
  }
  array.shift(); //删除表头
  let distance = 0;
  for (const pa of array) {
    if (!isNaN(pa[d_i]) && !isNaN(pa[p_i])) {
      distance = pa[d_i] * Math.cos(pa[p_i] * (Math.PI / 180));
      break;
    }
  }
  // 创建Chart.js实例
  // const container = document.getElementById("chartContainer");
  // const canvas = document.getElementById("dataChart");
  // const chartSize =
  //   Math.floor(
  //     Math.min(container.clientWidth, container.clientHeight) / 100
  //   ) * 100;
  // canvas.width = chartSize;
  // canvas.height = chartSize;
  const ctx = document.getElementById("dataChart").getContext("2d");
  if (dataChart) {
    dataChart.destroy();
  }
  let chartDatasets = [
    {
      data: array.map((pa) => ({
        x: 0, // 所有点的x值都为0
        y: -pa[d_i],
      })),
      borderColor: "blue", // 点的颜色
      fill: false,
      pointRadius: 3, // 点的半径
      showLine: false, // 不显示线
    },
  ];
  const lineLength = 200;
  for (let i = 0; i < array.length; i++) {
    const pa = array[i];
    const angleValue = Number(pa[p_i]);
    const x1 = -distance * Math.sin(angleValue * (Math.PI / 180));
    const y1 = -pa[d_i] + distance * Math.cos(angleValue * (Math.PI / 180));
    const x2 = x1 + lineLength;
    const y2 = y1 + Math.tan(angleValue * (Math.PI / 180)) * lineLength;
    const x3 = x1 - lineLength;
    const y3 = y1 - Math.tan(angleValue * (Math.PI / 180)) * lineLength;
    chartDatasets.push({
      data: [
        { x: 0, y: -pa[d_i] },
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        { x: x3, y: y3 },
      ],
      borderColor: "rgba(255, 0, 0, 0.5)", // 线的颜色
      borderWidth: 0.8, // 线的宽度
      fill: false,
      pointRadius: 1, // 点的半径
    });
  }
  const chartData = {
    datasets: chartDatasets,
  };
  const chartOptions = {
    responsive: true,
    // maintainAspectRatio: false,
    scales: {
      x: {
        type: "linear",
        position: "bottom",
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 5,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      zoom: {
        pan: {
          // 启用平移
          enabled: true, // 启用平移
          mode: "xy", // 平移模式，可以设置为 'x'、'y' 或 'xy'
          speed: 20, // 平移速度
          threshold: 10, // 平移的触发阈值
          modifierKey: "ctrl",
        },
        zoom: {
          // 启用缩放
          mode: "xy",
          wheel: {
            enabled: true, // 鼠标滚轮缩放
          },
          drag: {
            enabled: true,
          },
          pitch: {
            enabled: true,
          },
        },
      },
    },
  };
  dataChart = new Chart(ctx, {
    type: "line", // 使用折线图类型
    data: chartData,
    options: chartOptions,
  });
}

export function useDataShow() {
  return {
    extractedData,
    tableDateToArray,
    getDataFromArray,
    createChart,
    chartMouseMoveAction,
    convertArrayToExcelFormat,
    createWaterLineChart,
    importRegex,
  };
}
