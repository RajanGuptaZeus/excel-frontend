class Spreadsheet {
  constructor(canvasId, scrollContainerId) {
    this.canvas = document.getElementById(canvasId);
    this.c = this.canvas.getContext("2d");
    this.scrollContainer = document.getElementById(scrollContainerId);

    this.cellWidth = 125;
    this.cellHeight = 40;
    this.columnHeaderHeight = 30;
    this.rowHeaderWidth = 50;
    this.cellCountX = 20;
    this.cellCountY = 100000;

    this.columnWidths = new Array(this.cellCountX).fill(this.cellWidth);
    this.rowHeights = new Array(this.cellCountY).fill(this.cellHeight);

    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.maxScrollTop = 0;
    this.maxScrollLeft = 0;

    this.cellContents = [];
    this.cellSelected = { x: null, y: null };
    this.selectionStart = { x: null, y: null };
    this.highLighCell = { x: null, y: null };

    this.isResizing = false;
    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.resizeIndex = 0;
    this.resizeType = "";

    this.isMouseDown = false;
    this.isDragging = false;

    this.visibleRows = 0;
    this.visibleColumns = 0;

    this.initEventListeners();
    this.updateCanvasSize();
  }

  initEventListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    window.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));
    this.canvas.addEventListener("dblclick", this.handleDoubleClick.bind(this));
    window.addEventListener("resize", this.handleResize.bind(this));
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  handleMouseDown(event) {
    this.isMouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left + this.scrollLeft;
    const mouseY = event.clientY - rect.top + this.scrollTop;

    let cellX = -1;
    let cellY = -1;
    let accumulatedWidth = this.rowHeaderWidth;
    let accumulatedHeight = this.columnHeaderHeight;

    for (let i = 0; i < this.cellCountX; i++) {
      if (mouseX < accumulatedWidth + this.columnWidths[i]) {
        cellX = i;
        break;
      }
      accumulatedWidth += this.columnWidths[i];
    }

    for (let i = 0; i < this.cellCountY; i++) {
      if (mouseY < accumulatedHeight + this.rowHeights[i]) {
        cellY = i;
        break;
      }
      accumulatedHeight += this.rowHeights[i];
    }

    if (
      cellX >= -10 &&
      cellY >= -10 &&
      cellX < this.cellCountX &&
      cellY < this.cellCountY
    ) {
      this.cellSelected = { x: cellX, y: cellY };
      this.selectionStart = { x: cellX, y: cellY };
      this.highLighCell = { x: cellX, y: cellY };
      this.drawGrid();
    }

    const resizeHandleWidth = 6;
    if (mouseY <= this.columnHeaderHeight) {
      this.isMouseDown = false;
      for (let i = 0; i < this.cellCountX; i++) {
        const x =
          this.rowHeaderWidth +
          this.columnWidths.slice(0, i).reduce((a, b) => a + b, 0) -
          this.scrollLeft;
        if (
          Math.abs(mouseX - (x + this.columnWidths[i])) <=
          resizeHandleWidth / 2
        ) {
          this.isResizing = true;
          this.resizeStartX = mouseX;
          this.resizeIndex = i;
          this.resizeType = "column";
          this.canvas.style.cursor = "col-resize";
        }
      }
      this.handleHeaderClick(event);
      return;
    } else if (mouseX <= this.rowHeaderWidth) {
      this.isMouseDown = false;
      for (let i = 0; i < this.visibleRows; i++) {
        const y =
          this.columnHeaderHeight +
          this.rowHeights.slice(0, i).reduce((a, b) => a + b, 0) -
          this.scrollTop;
        if (
          Math.abs(mouseY - (y + this.rowHeights[i])) <=
          resizeHandleWidth / 2
        ) {
          this.isResizing = true;
          this.resizeStartY = mouseY;
          this.resizeIndex = i;
          this.resizeType = "row";
          this.canvas.style.cursor = "row-resize";
        }
      }
      this.handleHeaderClick(event);
      return;
    }
  }

  handleMouseMove(event) {
    if (this.isResizing) {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      if (this.resizeType === "column") {
        const newWidth = Math.max(
          50,
          mouseX - this.resizeStartX + this.columnWidths[this.resizeIndex]
        );
        this.columnWidths[this.resizeIndex] = newWidth;
      } else if (this.resizeType === "row") {
        const newHeight = Math.max(
          20,
          mouseY - this.resizeStartY + this.rowHeights[this.resizeIndex]
        );
        this.rowHeights[this.resizeIndex] = newHeight;
      }

      this.updateCanvasSize();
      this.drawGrid();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left + scrollLeft;
    const mouseY = event.clientY - rect.top + scrollTop;
    const resizeHandleWidth = 6;
    if (mouseY <= columnHeaderHeight) {
      isMouseDown = false;
      for (let i = 0; i < cellCountX; i++) {
        const x =
          rowHeaderWidth +
          columnWidths.slice(0, i).reduce((a, b) => a + b, 0) -
          scrollLeft;
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

  handleMouseUp() {
    if (this.isResizing) {
      this.isResizing = false;
      this.canvas.style.cursor = "cell";
      return;
    }
    this.isMouseDown = false;
    this.highLighCell = { x: null, y: null };
    this.selectionStart = { x: null, y: null };
  }

  handleWheel(event) {
    event.preventDefault();
    const oldScrollTop = this.scrollTop;
    this.scrollTop = Math.max(
      0,
      Math.min(this.maxScrollTop, this.scrollTop + event.deltaY)
    );
    this.scrollLeft = Math.max(
      0,
      Math.min(this.maxScrollLeft, this.scrollLeft + event.deltaX)
    );
    if (oldScrollTop !== this.scrollTop) {
      this.handleScroll();
      this.updateScrollThumb();
    }

    this.drawGrid();
  }

  handleDoubleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left + this.scrollLeft;
    const mouseY = event.clientY - rect.top + this.scrollTop;

    let cellX = -1,
      cellY = -1;
    let accumulatedWidth = this.rowHeaderWidth;
    let accumulatedHeight = this.columnHeaderHeight;

    for (let i = 0; i < this.cellCountX; i++) {
      if (mouseX < accumulatedWidth + this.columnWidths[i]) {
        cellX = i;
        break;
      }
      accumulatedWidth += this.columnWidths[i];
    }

    for (let i = 0; i < this.cellCountY; i++) {
      if (mouseY < accumulatedHeight + this.rowHeights[i]) {
        cellY = i;
        break;
      }
      accumulatedHeight += this.rowHeights[i];
    }

    if (
      cellX >= 0 &&
      cellY >= 0 &&
      cellX < this.cellCountX &&
      cellY < this.cellCountY
    ) {
      this.cellSelected = { x: cellX, y: cellY };
      this.showInputForCell(cellX, cellY);
    }
  }

  handleResize() {
    this.updateCanvasSize();
    this.updateScrollThumb();
    this.drawGrid();
  }

  handleKeyDown(event) {
    // Key down handling...
  }

  updateCanvasSize() {
    this.visibleRows = Math.ceil(
      (this.scrollContainer.clientHeight - this.columnHeaderHeight) /
        this.cellHeight
    );
    this.visibleColumns = Math.ceil(
      (this.scrollContainer.clientWidth - this.rowHeaderWidth - 10) /
        this.cellWidth
    );

    this.maxScrollTop = Math.max(
      0,
      this.cellCountY * this.cellHeight -
        (this.scrollContainer.clientHeight - this.columnHeaderHeight)
    );
    this.maxScrollLeft = Math.max(
      0,
      this.cellCountX * this.cellWidth -
        (this.scrollContainer.clientWidth - this.rowHeaderWidth - 10)
    );

    this.canvas.width = this.scrollContainer.clientWidth - 10; // Subtract scrollbar width
    this.canvas.height = this.scrollContainer.clientHeight;

    this.updateScrollThumb();
  }

  drawGrid() {
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

  drawHeaders() {
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

  

  updateScrollThumb() {
    // Scroll thumb update logic...
  }

  showInputForCell(x, y) {
    // Cell input logic...
  }

  handleScroll() {
    // Scroll handling logic...
  }

  handleHeaderClick(event) {
    // Header click handling...
  }
}

// Usage
const spreadsheet = new Spreadsheet("spreadsheetCanvas", "scrollContainer");
spreadsheet.drawGrid();
