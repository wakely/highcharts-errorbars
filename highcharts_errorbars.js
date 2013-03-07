/////////////////////////////////////////////////////////////////////////////////////////
//  Error Bars for Highcharts Scatter Charts
//  Scott Wakely,  inspired by Amin Ghadersohi's column version
//  7/19/2012 - v.0.01
//

(function () {
  // create shortcuts
  var HC = Highcharts,
    defaultOptions = HC.getOptions(),
    defaultPlotOptions = defaultOptions.plotOptions,
    seriesTypes = HC.seriesTypes,
    extend = HC.extend,
    each = HC.each,
    merge = HC.merge,
    pick = HC.pick;

  // Start with the scatter-plot defaults
  defaultPlotOptions.ErrorBar = merge(defaultPlotOptions.scatter, {
    animation:false,
    lineWidth:1.0,
    states:{
      hover:{brightness:0.1, lineWidth:3}
    }
  });

  // Make the ErrorBar Point object
  var ErrorBarPoint = Highcharts.extendClass(Highcharts.Point, {
    //makes lint more happy
    dyHi:0,
    dyLo:0,

    applyOptions:function (options) {
      var point = this;
      var series = point.series;

      //We will only accept objects as data
      if (typeof options == 'object' && typeof options.length != 'number') {
        extend(point, options);
        point.err_hi = point.y + point.dyHi;
        point.err_lo = point.y - point.dyLo;
        point.options = options;
      } else {
        console.log("Bad object passed to ErrorBarPoint");
      }

      // If no x is set, auto-increment
      if (point.x === undefined) {
        point.x = series.autoIncrement();
      }
    },

    //Tool-tip with some error bar support
    tooltipFormatter:function () {
      var point = this;
      var series = point.series;
      return ['<span style="color:' + series.color + ';font-weight:bold">', (point.name || series.name), '</span><br/>',
        'x:', (point.x), '<br>', 'y:', point.y, '<br>', 'dyHi:', point.dyHi, '<br>', 'dyLo:', point.dyLo].join('');
    }

  });

  // Make the ErrorBar Series object
  seriesTypes.ErrorBar = Highcharts.extendClass(seriesTypes.scatter, {
    type:'ErrorBar',
    sorted:false,
    pointClass:ErrorBarPoint,

    // mapping between SVG attributes and their corresponding options
    pointAttrToOptions:{
      stroke:'color',
      'stroke-width':1, //this is what fucked it all up!
      r:'radius',
      fill:'fillColor'
    },

    // Translate data points from raw values x and y to plotX and plotY, etc
    // x and y will get done automatically.  Need to do others by hand
    translate:function () {
      var series = this;
      var yAxis = series.yAxis;

      seriesTypes.scatter.prototype.translate.apply(series);

      // loop over values in series.data
      each(this.data, function (point) {

        //get graph coordinates for the error bar heights - handle log axes, please.
        point.plotYErrHi = yAxis.translate(point.err_hi, 0, 1, 0, 1);
        point.plotYErrLo = yAxis.translate(point.err_lo, 0, 1, 0, 1);
      });
    },

    // Draw the data points
    drawPoints:function () {
      var series = this, //state = series.state,
        chart = series.chart,
        data = series.data,
        symbols = chart.renderer.symbols,
        plotX, plotY,
        pointAttr,
        graphic,
        isImage,
        symbol,
        radius;

      //Add an error-bar symbol
      symbols.error_bar = function (x, y, w, h, opt) {
        return [
          'M', x + w / 2, opt.plotYErrHi, 'L', x + w / 2, opt.plotYErrLo,
          'M', x, opt.plotYErrHi, 'L', x + w, opt.plotYErrHi,
          'M', x, opt.plotYErrLo, 'L', x + w, opt.plotYErrLo
        ];
      };

      //Now make some functions to extend the standard markers,
      var symNames = ['circle', 'diamond', 'square', 'triangle', 'triangle-down'];
      each(symNames, function (thisSym) {
        var newfunc = thisSym + "_err";
        chart.renderer.symbols[newfunc] = function (oldSym) {
          return function (x, y, w, h, opt) {
            return symbols[oldSym](x, y, w, h, opt).concat(symbols['error_bar'](x, y, w, h, opt));
          }
        }(thisSym);
      });

      each(data, function (point) {
        graphic = point.graphic;
        plotX = point.plotX;
        plotY = point.plotY;

        if (point.plotY !== undefined &&
          point.plotX >= 0 && point.plotX <= chart.plotSizeX &&
          point.plotY >= 0 && point.plotY <= chart.plotSizeY) {

          pointAttr = point.pointAttr[point.selected ? 'selected' : ''];
          radius = pointAttr.r;
          symbol = pick(point.marker && point.marker.symbol, series.symbol);

          //Here we over-ride the default choice to select the error-bar version
          symbol = symbol + "_err";
          isImage = symbol.indexOf('url') === 0;

          if (graphic) { // update only, if it already exists
            graphic.animate(extend({
              x:plotX - radius,
              y:plotY - radius
            }, graphic.symbolName ? { // don't apply to image symbols #507
              width:2 * radius,
              height:2 * radius
            } : {}));
          } else if (radius > 0 || isImage) {
            point.graphic = chart.renderer.symbol(
              symbol,
              plotX - radius,
              plotY - radius,
              2 * radius,
              2 * radius,
              {plotYErrHi:point.plotYErrHi, plotYErrLo:point.plotYErrLo}
            );
            point.graphic.attr(pointAttr).add(series.group);
          }
        }
      });
    }

  });

})();
