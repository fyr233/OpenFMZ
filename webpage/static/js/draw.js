//命名空间
var DRAW = {};
//实盘信息
DRAW.info = {};
//value数据
DRAW.valueData = [];
//custom数据
DRAW.customData = [];
//log数据
DRAW.logData = [];
//log已加载到的位置
DRAW.logLoadId = 0;

const url_params = new URLSearchParams(window.location.search);

//估值曲线
DRAW.Chart_allvalue_curve = echarts.init($('#allvalue_curve')[0], 'chalk');
DRAW.Chart_allvalue_curve.showLoading();
DRAW.Chart_allvalue_curve.setOption(option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params){
          data = params[0].data
          return '' + data[0].toLocaleString('chinese',{hour12:false}) + 
                '<br/>' + 
                data[1]
      }
    },
    title: {
      show: false,
      left: 'center',
      text: '估值曲线'
    },
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        restore: {},
        saveAsImage: {}
      }
    },
    xAxis: {
      type: 'time',
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      boundaryGap: [0, '100%'],
      min: 'dataMin',
      max: 'dataMax'
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        start: 0,
        end: 20
      }
    ],
    series: [
      {
        type: 'line',
        smooth: false,
        areaStyle: {},
        //data: data
      }
    ],
    dataset:{
        source:DRAW.valueData
    }
});

//获取并解析info文件
var infofile = 'latest.info';
if (url_params.has('info')){
    infofile = url_params.get('info') + '.info';
}

DRAW.infoXhr = $.get('../static/data/info/' + infofile + '?' + Math.random()).done(
    function(data){
        DRAW.info = JSON.parse(data);
        DRAW.setInfo();
        DRAW.getData();
    }
).fail(
    function(xhr, status){
        console.log('get logfile error: ' + status);
    }
);

DRAW.getData = function(){
    //根据解析的info，获取value文件
    DRAW.valueXhr = $.get('../static/data/' + DRAW.info.value + '?' + Math.random()).done(
        function(data){
            lines = data.split('\n');
            lines.forEach(line => {
                words = line.split(' ');
                if (words.length > 1){
                    let date = new Date(parseInt(words[0]));
                    let value = parseFloat(words[1]);
                    DRAW.valueData.push([date, value]);
                }
            });

            DRAW.info.logSize += parseInt(DRAW.valueXhr.getResponseHeader('content-length'));
            DRAW.setInfo();
            DRAW.Chart_allvalue_curve.setOption({
                dataset: {source: DRAW.valueData}
            });
            DRAW.Chart_allvalue_curve.hideLoading();
        }
    ).fail(
        function(xhr, status){
            console.log('get valuefile error: ' + status);
        }
    );

    //根据解析的info，获取custom文件
    DRAW.customXhr = $.get('../static/data/' + DRAW.info.custom.file + '?' + Math.random()).done(
        function(data){
            lines = data.split('\n');
            //限制数据量
            let maxlines = 150000;
            if (lines.length > maxlines)
            {
                lines.splice(0, lines.length - maxlines);
            }
            lines.forEach(line => {
                words = line.split(' ');
                if (words.length > 3){
                    let groupId = parseInt(words[0]);
                    let id = parseInt(words[1]);
                    let date = new Date(parseInt(words[2]));
                    let value = parseFloat(words[3]);
                    DRAW.customData.push([groupId, id, date, value]);
                }
            });

            DRAW.info.logSize += parseInt(DRAW.customXhr.getResponseHeader('content-length'));
            DRAW.setInfo();
            DRAW.setCustom();
        }
    ).fail(
        function(xhr, status){
            console.log('get customfile error: ' + status);
        }
    );

    //根据解析的info，获取log文件
    DRAW.logXhr = $.get('../static/data/' + DRAW.info.log + '?' + Math.random()).done(
        function(data){
            lines = data.split('\n');
            lines.forEach(line => {
                words = line.split(' ');
                if (words.length > 2){
                    let date = new Date(parseInt(words[0]));
                    let type = words[1];
                    let msg = words.slice(2).join(' ');
                    DRAW.logData.push([date, type, msg]);
                }
            });

            DRAW.info.logSize += parseInt(DRAW.logXhr.getResponseHeader('content-length'));
            DRAW.setInfo();
            //DRAW.setLog();
        }
    ).fail(
        function(xhr, status){
            console.log('get logfile error: ' + status);
        }
    );
}

DRAW.setInfo = function(){
    $('#info_startTime').text('开始于: ' + new Date(DRAW.info.start).toLocaleString('chinese',{hour12:false}));
    $('#info_fileName').text(DRAW.info.file);
    $('#info_logSize').text('日志大小: ' + Math.round(100 * DRAW.info.logSize / 1024) / 100 + 'KB');

    if (DRAW.valueData && DRAW.valueData.length > 1){
        let t1 = DRAW.valueData[0][0], v1 = DRAW.valueData[0][1];
        let t2 = DRAW.valueData[DRAW.valueData.length-1][0], v2 = DRAW.valueData[DRAW.valueData.length-1][1];
        let APY =  (v2 / v1 - 1.0) / ((t2 - t1)/1000/3600/24) * 365;
        $('#info_APY').text('线性年化: ' + APY);
    }


    $('#info_last').attr("href", "/?info=" + DRAW.info.start);
    $('#info_last').text("/?info=" + DRAW.info.start)
}

//画多个自定义曲线
DRAW.setCustom = function(){
    DRAW.customCharts = [];
    DRAW.customGroups = [];

    DRAW.customData.forEach(line => {
        if (DRAW.customGroups[line[0]] == undefined){
            DRAW.customGroups[line[0]] = [];
        }
        if (DRAW.customGroups[line[0]][line[1]] == undefined){
            DRAW.customGroups[line[0]][line[1]] = [];
        }
        DRAW.customGroups[line[0]][line[1]].push([line[2], line[3]]);
    });

    DRAW.customGroups.forEach((group, i) => {
        
        if (group != undefined){
            var chartDiv = $('<div class="custom_curve"></div>');
            $('#custom').append(chartDiv);
            var customChart = echarts.init(chartDiv[0], 'chalk');
            DRAW.customCharts.push(customChart);
            customChart.showLoading();

            var chartSeries = [];
            var cfg = DRAW.info.custom.cfgs[i];
            var start = 0;
            for (start = 0; group[start] == undefined; start++){}
            for (var j = 0; j < group.length; j++){
                if (group[j] != undefined){
                    var s = cfg.series[j - start];
                    if (s.type == undefined){
                        s.type = 'line';
                    }
                    s.smooth = false;
                    s.data = group[j];
                    chartSeries.push(s);
                }
            }

            customChart.setOption(option = {
                tooltip: {
                  trigger: 'axis',
                  /*
                  formatter: function(params){
                      data = params[0].data
                      return '' + data[0].toLocaleString('chinese',{hour12:false}) + 
                            '<br/>' + 
                            data[1]
                  }
                  */
                 axisPointer: { type: 'cross' }
                },
                
                title: {
                  show: true,
                  left: 'center',
                  text: cfg.title.text
                },
                toolbox: {
                  feature: {
                    dataZoom: {
                      yAxisIndex: 'none'
                    },
                    restore: {},
                    saveAsImage: {}
                  }
                },
                xAxis: cfg.xAxis,
                yAxis: cfg.yAxis,
                dataZoom: [
                  {
                    type: 'inside',
                    start: 0,
                    end: 100
                  },
                  {
                    start: 0,
                    end: 20
                  }
                ],
                series: chartSeries
            });
            customChart.hideLoading();
        }
    })
}

DRAW.setLog = function(start, end){
    if (start > DRAW.logData.length-1)
        return;
    if (end > DRAW.logData.length-1)
        end = DRAW.logData.length-1;
    var logDiv = $('#log');
    for (let i = DRAW.logData.length-1 - start; i >= DRAW.logData.length-1 - end; i--){
        let line = DRAW.logData[i];
        var logItem = $('<div class="log_item">' + 
            '<i class="log_time">' + 
            line[0].toLocaleString('chinese',{hour12:false}) + ' ' + line[1] + 
            '</i>' +
            '<br>' + 
            '&emsp;&emsp;' + line[2] + 
            '</div>');

        logDiv.append(logItem);
    }
    DRAW.logLoadId = end;
}

//当页面滚动至底部时加载日志
$(window).scroll(function(){
        var scrollTop = $(this).scrollTop();
        var scrollHeight = $(document).height();
        var windowHeight = $(this).height();

        if(scrollTop + windowHeight >= scrollHeight - 10){
            DRAW.setLog(DRAW.logLoadId + 1, DRAW.logLoadId + 20);
        }
    });