import { useRecordStore } from "@/store/useRecordStore";
import { saveAs } from "file-saver";
import { computed } from "vue";
// 导入 useDataCode 工具函数，用于数据编码转换
import { useDataCode } from "@/utils/useDataCode/useDataCode";
const { records } = useRecordStore();
// 从 useDataCode 工具函数中解构出 bufferToDecFormat, bufferToHexFormat, bufferToString, stringToHtml 函数
const { bufferToDecFormat, bufferToHexFormat, bufferToString, stringToHtml } = useDataCode();

const saveRecordsToFile = () => {
  const fileContent = JSON.stringify(
    records.value.map((record) => {
      if (record.display === "hex") {
        return {
          type: record.type,
          data: Array.from(record.data)
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join(" "),
          time: record.time.toISOString(),
          display: record.display,
        };
      } else if (record.display === "ascii") {
        return {
          type: record.type,
          data: bufferToString(record.data),
          time: record.time.toISOString(),
          display: record.display,
        };
      }
      return record;
    }),
    null,
    2
  );
  const blob = new Blob([fileContent], {
    type: "application/json;charset=utf-8",
  });
  saveAs(blob, "serial_records.json");
};
export function useRecordSave() {
    return {
        saveRecordsToFile,
    };
  }
