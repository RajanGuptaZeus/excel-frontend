const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
let minX, maxX, minY, maxY;
let visibleRows, visibleColumns, maxScrollTop, maxScrollLeft;
let startY;
let apiData = [];
let cellContents = [];
let cellSelected = { x: null, y: null };
let selectionStart = { x: null, y: null };
let highLighCell = { x: null, y: null };
let scrollTop = 0;
let scrollLeft = 0;
const cellWidth = 125;
const cellHeight = 40;
const columnHeaderHeight = 30;
const rowHeaderWidth = 50;
let cellCountX = 20;
let cellCountY = 100000;
let columnWidths = new Array(cellCountX).fill(cellWidth);
let rowHeights = new Array(cellCountY).fill(cellHeight);
let resizeStartX, resizeStartY, resizeIndex, resizeType;
const availableFormulas = ["SUM", "AVERAGE", "MAX", "MIN"];
canvas.style.cursor = "cell";
canvas.width = cellCountX * cellWidth + 50;
canvas.height = window.innerHeight;
const baseUrl = "http://localhost:5006/";
let currentPage = 1;
const pageSize = 100;
let isResizing = false;
let isMouseDown = false;
let isLoading = false;
let isDragging = false;

let modifiedRows = [];
// file input
const fileInput = document.getElementById("file");
const nameDisplay = document.getElementById("inputFileName");
const submitButton = document.getElementById("submitFile");
const deleteBtn = document.querySelector("#deleteBtn");
const addDataBtn = document.getElementById("addDataBtn");
const addDataContainer = document.getElementById("addData");
const closeBtn = document.getElementById("closeBtn");
const scrollContainer = document.getElementById("scrollContainer");
const verticalScrollbar = document.getElementById("verticalScrollbar");
const scrollThumb = document.getElementById("scrollThumb");
document.getElementById("updateRowBtn").addEventListener("click", updateRowsHandler);

addDataContainer.addEventListener("submit", async function (e) {
  e.preventDefault();
  try {
    const formData = new FormData(this);
    const jsonData = Object.fromEntries(formData.entries());
    const data = await fetch(`${baseUrl}api/UploadFile/addSingleData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonData),
    });
    const res = await data.json();
    alert(`${res.isSuccess} || ${res.message}`);
    if (res.isSuccess === true) {
      addDataContainer.reset();
      window.location.reload();
    }
  } catch (error) {
    alert("something went wrong");
    console.log(error);
  }
});

addDataBtn.addEventListener("click", function () {
  if (addDataContainer.classList.contains("hide")) {
    addDataContainer.classList.remove("hide");
    addDataContainer.classList.add("show");
  } else {
    addDataContainer.classList.remove("show");
    addDataContainer.classList.add("hide");
  }
});

closeBtn.addEventListener("click", function () {
  addDataContainer.classList.remove("show");
  addDataContainer.classList.add("hide");
});

deleteBtn.addEventListener("click", async function () {
  try {
    const res = await fetch(`${baseUrl}api/UploadFile`, {
      method: "DELETE",
    });
    const jsonData = await res.json();
    alert(`success : ${jsonData.isSuccess}  || message : ${jsonData.message}`);
    return location.reload();
  } catch (error) {
    alert(`success : false  || message : ${error}`);
    return console.log(error);
  }
});

submitButton.addEventListener("click", async function () {
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file");
    return;
  }
  const fileName = file.name;
  const fileExtension = fileName.split(".").pop().toLowerCase();

  if (
    fileExtension !== "csv" &&
    fileExtension !== "xlsx" &&
    fileExtension !== "xls"
  ) {
    alert("Please select a CSV or Excel file");
    return;
  }

  nameDisplay.textContent = fileName;
  await uploadFile(file);
});

const deleteData = async () => {
  try {
    let emailIds = getSelectedCellsData();
    const response = await fetch(`${baseUrl}api/UploadFile/deleteSingleData`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailIds),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    alert(result.message || "Data deleted successfully");
    return window.location.reload();
  } catch (error) {
    console.error("Error deleting data:", error);
    alert("An error occurred while deleting data");
  }
};

async function uploadFile(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const url = `${baseUrl}api/UploadFile/`;
    const data = await fetch(url, {
      method: "POST",
      body: formData,
    });
    const res = await data.json();
    alert(res?.message);
    setInterval(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.log(error);
  }
}

async function getData(pageNo) {
  try {
    const url = `${baseUrl}api/UploadFile/pageNo?pageNo=${pageNo}&limit=${pageSize}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

async function loadAndIntegrateData(pageNo) {
  if (isLoading) return;

  isLoading = true;
  try {
    const newData = await getData(pageNo);
    const startRow = (pageNo - 1) * pageSize;

    for (let i = 0; i < newData.length; i++) {
      const rowIndex = startRow + i;
      if (!cellContents[rowIndex]) {
        cellContents[rowIndex] = [];
      }
      const rowData = newData[i].split(",");
      for (let j = 0; j < rowData.length; j++) {
        cellContents[rowIndex][j] = {
          formula: "",
          value: rowData[j].trim(),
        };
      }
    }

    // Update cellCountY and cellCountX
    cellCountY = Math.max(cellCountY, startRow + newData.length + 100);

    cellCountX = Math.max(
      cellCountX,
      Math.max(...newData.map((row) => row.split(",").length)) + 40
    );

    // Update canvas dimensions
    updateCanvasDimensions();

    updateCanvasSize();
    drawGrid();
  } catch (error) {
    console.error("Error loading data:", error);
  } finally {
    isLoading = false;
  }
}

function initializeCellContents() {
  for (let i = 0; i < cellCountY; i++) {
    if (apiData[i]) {
      cellContents[i] = apiData[i].split(",").map((value) => ({
        formula: "",
        value: value.trim(),
      }));
    } else {
      cellContents[i] = new Array(cellCountX).fill().map(() => ({
        formula: "",
        value: "",
      }));
    }
  }
}

function getColumnLabel(column) {
  let label = "";
  while (column >= 0) {
    label = String.fromCharCode(65 + (column % 26)) + label;
    column = Math.floor(column / 26) - 1;
  }
  return label;
}

function drawGrid() {
  c.clearRect(0, 0, canvas.width, canvas.height);

  const startRow = Math.floor(scrollTop / cellHeight);
  const endRow = Math.min(startRow + visibleRows, cellCountY);
  const startCol = Math.floor(scrollLeft / cellWidth);
  const endCol = Math.min(startCol + visibleColumns, cellCountX);

  // Draw headers
  drawHeaders();
  // Highlight selected cell's headers
  if (cellSelected.x !== null && cellSelected.y !== null) {
    isCellSelected(cellSelected.x, cellSelected.y);
  }

  // Draw grid lines
  c.beginPath();
  c.strokeStyle = "black";
  c.lineWidth = 0.2;

  // Vertical lines
  for (let j = startCol; j <= cellCountY; j++) {
    const x =
      rowHeaderWidth +
      columnWidths.slice(0, j).reduce((a, b) => a + b, 0) -
      scrollLeft;
    c.moveTo(x + 0.5, 0);
    c.lineTo(x + 0.5, canvas.height);
  }

  // Horizontal lines
  for (let i = startRow; i <= endRow; i++) {
    const y =
      columnHeaderHeight +
      rowHeights.slice(0, i).reduce((a, b) => a + b, 0) -
      scrollTop;
    c.moveTo(0, y + 0.5);
    c.lineTo(canvas.width, y + 0.5);
  }
  c.stroke();

  // draw cell
  for (let i = startRow; i < endRow; i++) {
    for (let j = startCol; j < endCol; j++) {
      const x =
        rowHeaderWidth +
        columnWidths.slice(0, j).reduce((a, b) => a + b, 0) -
        scrollLeft;
      const y =
        columnHeaderHeight +
        rowHeights.slice(0, i).reduce((a, b) => a + b, 0) -
        scrollTop;
      const cellData =
        cellContents[i] && cellContents[i][j]
          ? cellContents[i][j]
          : { value: "", formula: "" };
      // isCellSelected(j, i);
      drawCell(x, y, cellData, columnWidths[j], rowHeights[i]);
    }
  }
}

function drawHeaders() {
  const headerColor = "#f0f0f0";
  const defaultBorderColor = "black";

  c.fillStyle = headerColor;
  c.fillRect(0, 0, canvas.width, columnHeaderHeight);
  c.fillRect(0, 0, rowHeaderWidth, canvas.height);

  // Draw default header borders
  c.strokeStyle = defaultBorderColor;
  c.lineWidth = 0.5;

  // Column headers bottom border
  c.beginPath();
  c.moveTo(0, columnHeaderHeight);
  c.lineTo(canvas.width, columnHeaderHeight);
  c.stroke();

  // Row headers right border
  c.beginPath();
  c.moveTo(rowHeaderWidth, 0);
  c.lineTo(rowHeaderWidth, canvas.height);
  c.stroke();

  // Draw header text
  c.fillStyle = "black";
  c.font = "15px Arial";
  c.textAlign = "center";
  c.textBaseline = "middle";

  // Draw column headers
  for (let i = 0; i < cellCountX; i++) {
    const x =
      rowHeaderWidth +
      columnWidths.slice(0, i).reduce((a, b) => a + b, 0) -
      scrollLeft;
    if (x + cellWidth > 0 && x < canvas.width) {
      c.fillText(
        getColumnLabel(i),
        x + columnWidths[i] / 2,
        columnHeaderHeight / 2
      );
    }
  }

  // Draw row headers
  const startRow = Math.floor(scrollTop / cellHeight);
  const endRow = Math.min(startRow + visibleRows, cellCountY);

  for (let i = startRow; i < endRow; i++) {
    const y =
      columnHeaderHeight +
      rowHeights.slice(0, i).reduce((a, b) => a + b, 0) -
      scrollTop;
    c.fillText(i + 1, rowHeaderWidth / 2, y + rowHeights[i] / 2);
  }
}

function highlightHeaders(startX, endX, startY, endY) {
  const headerHighlightColor = "#CAEAD8";
  const selectedBorderColor = "#008000";
  const textColor = "#0F7040";
  c.save();

  // Precalculate accumulated widths and heights
  const accumulatedWidths = [0];
  const accumulatedHeights = [0];
  for (let i = 0; i < endX; i++) {
    accumulatedWidths.push(accumulatedWidths[i] + columnWidths[i]);
  }
  for (let i = 0; i < endY; i++) {
    accumulatedHeights.push(accumulatedHeights[i] + rowHeights[i]);
  }

  // Set common styles
  c.fillStyle = headerHighlightColor;
  c.strokeStyle = selectedBorderColor;
  c.lineWidth = 2;
  c.font = "15px Arial";
  c.textAlign = "center";
  c.textBaseline = "middle";

  // Highlight and draw borders for column headers
  for (let x = startX; x <= endX; x++) {
    const headerX = rowHeaderWidth + accumulatedWidths[x] - scrollLeft;
    c.fillRect(headerX, 0, columnWidths[x], columnHeaderHeight);
    c.strokeRect(headerX, columnHeaderHeight - 2, columnWidths[x], 2);
    c.fillStyle = textColor;
    c.fillText(
      getColumnLabel(x),
      headerX + columnWidths[x] / 2,
      columnHeaderHeight / 2
    );
    c.fillStyle = headerHighlightColor;
  }

  // Highlight and draw borders for row headers
  for (let y = startY; y <= endY; y++) {
    const headerY = columnHeaderHeight + accumulatedHeights[y] - scrollTop;
    c.fillRect(0, headerY, rowHeaderWidth, rowHeights[y]);
    c.strokeRect(rowHeaderWidth - 2, headerY, 2, rowHeights[y]);
    c.fillStyle = textColor;
    c.fillText(y + 1, rowHeaderWidth / 2, headerY + rowHeights[y] / 2);
    c.fillStyle = headerHighlightColor;
  }

  c.restore();
}

function handleHeaderClick(event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left + scrollLeft;
  const mouseY = event.clientY - rect.top + scrollTop;

  if (mouseY <= columnHeaderHeight) {
    // Column header click
    let accumulatedWidth = rowHeaderWidth;
    for (let i = 0; i < cellCountX; i++) {
      if (mouseX < accumulatedWidth + columnWidths[i]) {
        selectEntireColumn(i);
        break;
      }
      accumulatedWidth += columnWidths[i];
    }
  } else if (mouseX <= rowHeaderWidth) {
    // Row header click
    let accumulatedHeight = columnHeaderHeight;
    for (let i = 0; i < cellCountY; i++) {
      if (mouseY < accumulatedHeight + rowHeights[i]) {
        selectEntireRow(i);
        break;
      }
      accumulatedHeight += rowHeights[i];
    }
  }
}

function drawCell(x, y, cellData, width, height) {
  c.font = "14px Arial";
  c.fillStyle = "black";
  c.textAlign = "left";
  c.textBaseline = "middle";

  let displayText = cellData?.value?.toString();

  // Truncate text if it's too long
  if (c.measureText(displayText).width > width - 10) {
    while (
      c.measureText(displayText + "...").width > width - 10 &&
      displayText.length > 0
    ) {
      displayText = displayText.slice(0, -1);
    }
    displayText += "...";
  }

  c.fillText(displayText, x + 5, y + height / 2);
}

function selectEntireColumn(columnIndex) {
  selectionStart = { x: columnIndex, y: 0 };
  highLighCell = { x: columnIndex, y: cellCountY - 1 };
  cellSelected = { x: columnIndex, y: 0 };
  drawGrid();
}

function selectEntireRow(rowIndex) {
  selectionStart = { x: 0, y: rowIndex };
  highLighCell = { x: cellCountX - 1, y: rowIndex };
  cellSelected = { x: 0, y: rowIndex };
  drawGrid();
}

function updateCellContent(x, y, value) {
  if (!cellContents[y]) {
    cellContents[y] = [];
  }
  if (!cellContents[y][x]) {
    cellContents[y][x] = { formula: "", value: "" };
  }

  // Check if the content has actually changed
  if (cellContents[y][x].value !== value) {
    // const oldValue = cellContents[y][x].value;

    if (value.startsWith("=")) {
      cellContents[y][x].formula = value;
      cellContents[y][x].value = evaluateFormula(value.substring(1), x, y);
    } else {
      cellContents[y][x].formula = "";
      cellContents[y][x].value = value;
    }

    // Add the row to the modifiedRows array with email and changed content
    const email = cellContents[y][0]?.value || "";

    let rowUpdate = modifiedRows.find((row) => row.email === email);
    if (!rowUpdate) {
      rowUpdate = { email, changes: [] };
      modifiedRows.push(rowUpdate);
    }

    rowUpdate.changes.push({
      columnIndex: x,
      newValue: value,
    });
  }

  drawGrid();
}

function updateCanvasSize() {
  visibleRows = Math.ceil(
    (scrollContainer.clientHeight - columnHeaderHeight) /
      (rowHeights.reduce((a, b) => a + b, 0) / rowHeights.length)
  );
  visibleColumns = Math.ceil(
    (scrollContainer.clientWidth - rowHeaderWidth - 10) /
      (columnWidths.reduce((a, b) => a + b, 0) / columnWidths.length)
  );
  maxScrollTop = Math.max(0,rowHeights.slice(0, cellCountY).reduce((a, b) => a + b, 0) - (scrollContainer.clientHeight - columnHeaderHeight));
  maxScrollLeft = Math.max(0,columnWidths.slice(0, cellCountX).reduce((a, b) => a + b, 0) - (scrollContainer.clientWidth - rowHeaderWidth - 10));

  canvas.width = scrollContainer.clientWidth - 10;
  canvas.height = scrollContainer.clientHeight;

  updateScrollThumb();
}

function updateCanvasDimensions() {
  // Set canvas width
  canvas.width =
    columnWidths.slice(0, cellCountX).reduce((a, b) => a + b, 0) +
    rowHeaderWidth;

  // Set canvas height
  canvas.height = Math.min(
    window.innerHeight,
    rowHeights.slice(0, cellCountY).reduce((a, b) => a + b, 0) +
      columnHeaderHeight
  );
}

function evaluateFormula(formula, x, y) {
  const match = formula.match(/(\w+)\(([A-Z]\d+):([A-Z]\d+)\)/);
  if (match) {
    const [, operation, start, end] = match;
    const startCell = parseCellReference(start);
    const endCell = parseCellReference(end);
    switch (operation.toUpperCase()) {
      case "SUM":
        return sumRange(startCell, endCell);
      case "AVERAGE":
        return averageRange(startCell, endCell);
      case "MAX":
        return maxRange(startCell, endCell);
      case "MIN":
        return minRange(startCell, endCell);
      default:
        return "Error: Unknown operation";
    }
  }
  return "Error: Invalid formula";
}

function parseCellReference(ref) {
  const column = ref.charCodeAt(0) - 65;
  const row = parseInt(ref.substring(1)) - 1;
  return { x: column, y: row };
}

function isCellSelected() {
  if (
    !selectionStart ||
    (selectionStart.x === highLighCell.x && selectionStart.y === highLighCell.y)
  ) {
    // Single cell selection
    minX = maxX = cellSelected.x;
    minY = maxY = cellSelected.y;
  } else {
    // Multiple cell or full row/column selection
    minX = Math.min(selectionStart.x, highLighCell.x);
    maxX = Math.max(selectionStart.x, highLighCell.x);
    minY = Math.min(selectionStart.y, highLighCell.y);
    maxY = Math.max(selectionStart.y, highLighCell.y);
  }
  if (minX >= 0 && minY >= 0 && maxX >= 0 && maxY >= 0) {
    const startX =
      rowHeaderWidth +
      columnWidths.slice(0, minX).reduce((a, b) => a + b, 0) -
      scrollLeft;
    const startY =
      columnHeaderHeight +
      rowHeights.slice(0, minY).reduce((a, b) => a + b, 0) -
      scrollTop;
    const width = columnWidths.slice(minX, maxX + 1).reduce((a, b) => a + b, 0);
    const height = rowHeights.slice(minY, maxY + 1).reduce((a, b) => a + b, 0);

    c.fillStyle = "rgba(231, 241, 236, 0.9)";
    c.fillRect(startX, startY, width, height);

    c.strokeStyle = "#137E43";
    c.lineWidth = 2;
    c.strokeRect(startX, startY, width, height);

    // circle at bottom left
    const handleX = startX + width;
    const handleY = startY + height;
    const size = 6;
    const halfSize = size / 2;
    c.beginPath();
    c.arc(handleX, handleY, halfSize, 0, Math.PI * 2);
    c.fillStyle = "#137E43";
    c.fill();

    // Highlight headers for the selected range
    highlightHeaders(minX, maxX, minY, maxY);
    // return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }
}

function getSelectedCellsData() {
  let emailIds = [];
  for (let i = minY; i <= maxY; i++) {
    for (let j = minX; j <= maxX; j++) {
      let cellData =
        cellContents[i] && cellContents[i][0]
          ? cellContents[i][0]
          : { value: "" };
      let cellValue = cellData.value.trim();

      // Simple validation for email format
      // if (validateEmail(cellValue)) {
      emailIds.push(cellValue);
      // }
    }
  }

  return [...new Set(emailIds)];
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function handleEnterKeyPress() {
  if (cellSelected.x !== null && cellSelected.y !== null) {
    showInputForCell(cellSelected.x, cellSelected.y);
  }
}

function handleMouseDown(event) {
  isMouseDown = true;
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left + scrollLeft;
  const mouseY = event.clientY - rect.top + scrollTop;

  let cellX = -1;
  let cellY = -1;
  let accumulatedWidth = rowHeaderWidth;
  let accumulatedHeight = columnHeaderHeight;

  for (let i = 0; i < cellCountX; i++) {
    if (mouseX < accumulatedWidth + columnWidths[i]) {
      cellX = i;
      break;
    }
    accumulatedWidth += columnWidths[i];
  }

  for (let i = 0; i < cellCountY; i++) {
    if (mouseY < accumulatedHeight + rowHeights[i]) {
      cellY = i;
      break;
    }
    accumulatedHeight += rowHeights[i];
  }

  if (
    cellX >= -10 &&
    cellY >= -10 &&
    cellX < cellCountX &&
    cellY < cellCountY
  ) {
    cellSelected = { x: cellX, y: cellY };
    selectionStart = { x: cellX, y: cellY };
    highLighCell = { x: cellX, y: cellY };
    drawGrid();
  }
  const resizeHandleWidth = 6;
  if (mouseY <= columnHeaderHeight) {
    isMouseDown = false;
    for (let i = 0; i < cellCountX; i++) {
      const x =
        rowHeaderWidth +
        columnWidths.slice(0, i).reduce((a, b) => a + b, 0) -
        scrollLeft;
      if (Math.abs(mouseX - (x + columnWidths[i])) <= resizeHandleWidth / 2) {
        isResizing = true;
        resizeStartX = mouseX;
        resizeIndex = i;
        resizeType = "column";
        canvas.style.cursor = "col-resize";
      }
    }
    handleHeaderClick(event);
    return;
  } else if (mouseX <= rowHeaderWidth) {
    isMouseDown = false;
    for (let i = 0; i < visibleRows; i++) {
      const y =
        columnHeaderHeight +
        rowHeights.slice(0, i).reduce((a, b) => a + b, 0) -
        scrollTop;
      if (Math.abs(mouseY - (y + rowHeights[i])) <= resizeHandleWidth / 2) {
        isResizing = true;
        resizeStartY = mouseY;
        resizeIndex = i;
        resizeType = "row";
        canvas.style.cursor = "row-resize";
      }
    }
    handleHeaderClick(event);
    return;
  }
}

function handleScroll() {
  const visibleStartRow = Math.floor(scrollTop / cellHeight);
  const visibleEndRow = Math.min(cellCountY - 1, visibleStartRow + visibleRows);

  // Load next page if we're near the bottom
  if (visibleEndRow >= currentPage * pageSize - visibleRows / 2) {
    currentPage++;
    loadAndIntegrateData(currentPage);
  }

  // Load previous page if we're near the top
  if (
    visibleStartRow <= (currentPage - 1) * pageSize + visibleRows / 2 &&
    currentPage > 1
  ) {
    currentPage--;
    loadAndIntegrateData(currentPage);
  }
}

function showInputForCell(x, y) {
  let input = document.getElementById("cellInput");
  if (x === 0 && cellContents[0][y]) return;
  if (!input) {
    input = document.createElement("input");
    input.id = "cellInput";
    input.type = "text";
    input.style.position = "absolute";
    input.style.padding = "0 4px";
    input.style.zIndex = "10";
    scrollContainer.appendChild(input);
  }

  const cellX =
    rowHeaderWidth +
    columnWidths.slice(0, x).reduce((a, b) => a + b, 0) -
    scrollLeft;
  const cellY =
    columnHeaderHeight +
    rowHeights.slice(0, y).reduce((a, b) => a + b, 0) -
    scrollTop;

  let cellData =
    cellContents[y] && cellContents[y][x]
      ? cellContents[y][x]
      : { value: "", formula: "" };
  input.value = cellData.formula || cellData.value;
  input.style.left = `${cellX}px`;
  input.style.top = `${cellY}px`;
  input.style.width = `${columnWidths[x]}px`;
  input.style.height = `${rowHeights[y]}px`;
  input.style.display = "block";
  input.focus();

  input.onkeydown = (event) => {
    if (event.key === "Enter") {
      updateCellContent(x, y, input.value);
      input.style.display = "none";
      input.blur();
    } else if (event.key === "Tab") {
      event.preventDefault();
      updateCellContent(x, y, input.value);
      input.style.display = "none";
      input.blur();
      moveSelection(1, 0);
    }
  };

  input.onblur = () => {
    updateCellContent(x, y, input.value);
    input.style.display = "none";
    drawGrid();
  };
}

function handleMouseMove(event) {
  if (isResizing) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (resizeType === "column") {
      const newWidth = Math.max( 50, columnWidths[resizeIndex] + (mouseX - resizeStartX));
      columnWidths[resizeIndex] = newWidth;
      resizeStartX = mouseX;
    } else if (resizeType === "row") {
      const newHeight = Math.max( 20, rowHeights[resizeIndex] + (mouseY - resizeStartY) );
      rowHeights[resizeIndex] = newHeight;
      resizeStartY = mouseY;
    }
    drawGrid();
    return;
  }

  // hover mouse
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left + scrollLeft;
  const mouseY = event.clientY - rect.top + scrollTop;
  const resizeHandleWidth = 6;
  if (mouseY <= columnHeaderHeight) {
    isMouseDown = false;
    for (let i = 0; i < cellCountX; i++) {
      const x = rowHeaderWidth + columnWidths.slice(0, i).reduce((a, b) => a + b, 0) - scrollLeft;
      if (Math.abs(mouseX - (x + columnWidths[i])) <= resizeHandleWidth / 2) {
        canvas.style.cursor = "col-resize";
        return;
      } else {
        canvas.style.cursor = "default";
      }
    }
  } else if (mouseX <= rowHeaderWidth) {
    isMouseDown = false;
    for (let i = 0; i < visibleRows; i++) {
      const y =
        columnHeaderHeight +
        rowHeights.slice(0, i).reduce((a, b) => a + b, 0) -
        scrollTop;
      if (Math.abs(mouseY - (y + rowHeights[i])) <= resizeHandleWidth / 2) {
        canvas.style.cursor = "row-resize";
        return;
      } else {
        canvas.style.cursor = "default";
      }
    }
  } else {
    canvas.style.cursor = "cell";
  }

  if (isMouseDown) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left + scrollLeft;
    const mouseY = event.clientY - rect.top + scrollTop;
    const cellX = Math.floor((mouseX - rowHeaderWidth) / cellWidth);
    const cellY = Math.floor((mouseY - columnHeaderHeight) / cellHeight);

    if (
      cellX >= -10 &&
      cellY >= -10 &&
      cellX < cellCountX &&
      cellY < cellCountY
    ) {
      cellSelected = { x: cellX, y: cellY };
      highLighCell = { x: cellX, y: cellY };
      drawGrid();
    }
  }
}

function handleMouseUp() {
  if (isResizing) {
    isResizing = false;
    canvas.style.cursor = "cell";
    return;
  }
  isMouseDown = false;
  highLighCell = { x: null, y: null };
  selectionStart = { x: null, y: null };
}

function handleWheel(event) {
  event.preventDefault();
  const oldScrollTop = scrollTop;
  scrollTop = Math.max(0, Math.min(maxScrollTop, scrollTop + event.deltaY));
  scrollLeft = Math.max(0, Math.min(maxScrollLeft, scrollLeft + event.deltaX));
  if (oldScrollTop !== scrollTop) {
    handleScroll();
    updateScrollThumb();
  }

  drawGrid();
}

function sumRange(startCell, endCell) {
  let sum = 0;
  for (let i = startCell.y; i <= endCell.y; i++) {
    for (let j = startCell.x; j <= endCell.x; j++) {
      const value = parseFloat(cellContents[i][j].value);
      if (!isNaN(value)) {
        sum += value;
      }
    }
  }
  return sum;
}

function averageRange(startCell, endCell) {
  const sum = sumRange(startCell, endCell);
  const cellCount =
    (endCell.y - startCell.y + 1) * (endCell.x - startCell.x + 1);
  return sum / cellCount;
}

function maxRange(startCell, endCell) {
  let max = -Infinity;
  for (let i = startCell.y; i <= endCell.y; i++) {
    for (let j = startCell.x; j <= endCell.x; j++) {
      const value = parseFloat(cellContents[i][j].value);
      if (!isNaN(value) && value > max) {
        max = value;
      }
    }
  }
  return max === -Infinity ? 0 : max;
}

function minRange(startCell, endCell) {
  let min = Infinity;
  for (let i = startCell.y; i <= endCell.y; i++) {
    for (let j = startCell.x; j <= endCell.x; j++) {
      const value = parseFloat(cellContents[i][j].value);
      if (!isNaN(value) && value < min) {
        min = value;
      }
    }
  }
  return min === Infinity ? 0 : min;
}

document.addEventListener("keydown", function (event) {
  const activeElement = document.activeElement;
  const input = document.getElementById("cellInput");

  // Check if the input is focused
  if (activeElement === input) {
    // Handle arrow keys for input
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      // Let the default behavior handle cursor movement in the input
      return;
    }
  } else {
    // Handle arrow keys for canvas
    const step = 1;
    switch (event.key) {
      case "ArrowUp":
        moveSelection(0, -step);
        break;
      case "ArrowDown":
        moveSelection(0, step);
        break;
      case "ArrowLeft":
        moveSelection(-step, 0);
        break;
      case "ArrowRight":
        moveSelection(step, 0);
        break;
      case " ":
        handleEnterKeyPress();
        break;
    }
  }

  // Handle common keys regardless of focus
  if (event.key === " ") {
    handleEnterKeyPress();
  }

  // Add this new condition for Ctrl+C
  if (event.ctrlKey && event.key === "c") {
    event.preventDefault(); // Prevent default copy behavior
    copySelectedCells();
  }
});

function moveSelection(deltaX, deltaY) {
  if (cellSelected.x !== null && cellSelected.y !== null) {
    const newCellX = Math.max(0,Math.min(cellCountX - 1, cellSelected.x + deltaX));
    const newCellY = Math.max(0,Math.min(cellCountY - 1, cellSelected.y + deltaY));

    if (newCellX !== cellSelected.x || newCellY !== cellSelected.y) {
      cellSelected.x = newCellX;
      cellSelected.y = newCellY;
      drawGrid();
    }
  }
}

function updateScrollThumb() {
  const visibleRatio = canvas.height / (rowHeights.reduce((a, b) => a + b, 0) + columnHeaderHeight);
  const thumbHeight = Math.max( 200, visibleRatio * verticalScrollbar.clientHeight );
  scrollThumb.style.height = `${thumbHeight}px`;

  const scrollRatio = scrollTop / maxScrollTop;
  const thumbTop = scrollRatio * (verticalScrollbar.clientHeight - thumbHeight);
  scrollThumb.style.top = `${thumbTop}px`;
}

scrollThumb.addEventListener("mousedown", (e) => {
  isDragging = true;
  startY = e.clientY;
  startScrollTop = scrollTop;
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const deltaY = e.clientY - startY;
  const scrollRatio = deltaY / (verticalScrollbar.clientHeight - scrollThumb.clientHeight);
  scrollTop = Math.max( 0, Math.min(maxScrollTop, startScrollTop + scrollRatio * maxScrollTop) );
  updateScrollThumb();
  drawGrid();
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  document.body.style.userSelect = "";
});

verticalScrollbar.addEventListener("click", (e) => {
  if (e.target === scrollThumb) return;
  const clickRatio = (e.clientY - verticalScrollbar.getBoundingClientRect().top) / verticalScrollbar.clientHeight;
  scrollTop = Math.max(0, Math.min(maxScrollTop, clickRatio * maxScrollTop));
  updateScrollThumb();
  drawGrid();
});

function handleDoubleClick(event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left + scrollLeft;
  const mouseY = event.clientY - rect.top + scrollTop;

  // Calculate cellX and cellY based on variable widths and heights
  let cellX = -1,
    cellY = -1;
  let accumulatedWidth = rowHeaderWidth;
  let accumulatedHeight = columnHeaderHeight;

  for (let i = 0; i < cellCountX; i++) {
    if (mouseX < accumulatedWidth + columnWidths[i]) {
      cellX = i;
      break;
    }
    accumulatedWidth += columnWidths[i];
  }

  for (let i = 0; i < cellCountY; i++) {
    if (mouseY < accumulatedHeight + rowHeights[i]) {
      cellY = i;
      break;
    }
    accumulatedHeight += rowHeights[i];
  }
  if (cellX >= 0 && cellY >= 0 && cellX < cellCountX && cellY < cellCountY) {
    cellSelected = { x: cellX, y: cellY };
    showInputForCell(cellX, cellY);
  }
}

function copySelectedCells() {
  let copyText = "";
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (cellContents[y] && cellContents[y][x]) {
        copyText += cellContents[y][x].value;
      }
      if (x < maxX) copyText += "\t";
    }
    if (y < maxY) copyText += "\n";
  }

  // Use the Clipboard API to copy the text
  navigator.clipboard.writeText(copyText).then(
    () => {
      console.log("Cells copied to clipboard");
    },
    (err) => {
      console.error("Could not copy text: ", err);
    }
  );
}

async function updateRowsHandler() {
  try {
    if (modifiedRows.length === 0) {
      return alert("You have not modified any cell");
    }
    const data = await fetch(`${baseUrl}api/UploadFile/UpdateRows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(modifiedRows),
    });
    const res = await data.json();
    console.log(res);
    alert(`success : ${res.isSuccess} || message : ${res.message}`);
  } catch (error) {
    console.log(error);
    alert("Something went please Try again after some time");
  }
  console.log(modifiedRows);
  // modifiedRows = [];
}

canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("mousemove", handleMouseMove);
window.addEventListener("mouseup", handleMouseUp);
canvas.addEventListener("wheel", handleWheel);
canvas.addEventListener("dblclick", handleDoubleClick);
window.addEventListener("resize", function () {
  updateCanvasDimensions();
  updateCanvasSize();
  updateScrollThumb();
  drawGrid();
});

async function initializeApp() {
  try {
    console.log("Initializing app...");
    await loadAndIntegrateData(1);

    cellCountY = Math.max(100, apiData.length + 100);
    cellCountX = Math.max(
      100,
      Math.max(...apiData.map((row) => row.split(",").length)) + 40
    );

    updateCanvasDimensions();
    updateCanvasSize();
    updateScrollThumb();
    drawGrid();
    console.log("App initialized successfully");
  } catch (error) {
    console.error("Error initializing app:", error);
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);
const deleteSingleBtn = document.getElementById("deleteSingleBtn");
deleteSingleBtn.addEventListener("click", deleteData);
