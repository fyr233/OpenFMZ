import time
import os
import json
import sys

OUT_DATA_ROOT = './OpenFMZ/webpage/static/data/'
OUT_DATA_INFO = 'info/latest.info'
INFO = {
    "start": 0,
    "file": "py_filename",
    "logSize": 0,
    "value": 'value/0.value',
    "custom": {
        "file": 'custom/0.custom',
        "cfgs": {}
    },
    "log": 'log/0.log'
}

class Chart:
    def __init__(self, cfglist):
        global INFO
        self.cfgs = cfglist
        self.writebuffer = []
        self.buffersize = 10
        self.filelines = 0
        self.filelineslimit = 500000

        INFO["custom"]["cfgs"] = cfglist
        WriteINFO()

    def add(self, seriesId, d, usebuffer=True):
        groupId = self.seriesId2groupId(seriesId)
        s = str(groupId) + ' ' +\
            str(seriesId) + ' ' +\
            str(d[0]) + ' ' +\
            str(d[1]) + '\n'
        self.writebuffer.append(s)

        if len(self.writebuffer) > self.buffersize or not usebuffer:
            with open(OUT_DATA_ROOT + INFO["custom"]["file"], 'a') as f:
                f.write(''.join(self.writebuffer))
            self.filelines += len(self.writebuffer)
            self.writebuffer.clear()

        #如果文件过大，新建文件
        if self.filelines > self.filelineslimit:
            self.reset()
            self.filelines = 0

    def reset(self):
        global INFO
        nowstr = str(int(time.time()*1000))
        INFO["custom"]["file"] = 'custom/' + nowstr + '.custom'
        WriteINFO()
    
    def seriesId2groupId(self, seriesId):
        r = 0
        for i in range(len(self.cfgs)):
            for j in range(len(self.cfgs[i]['series'])):
                if r == seriesId:
                    return i
                else:
                    r += 1
        return -1

def Log(*arg):
    now = int(time.time()*1000)
    with open(OUT_DATA_ROOT + INFO["log"], 'a', encoding='utf8') as f:
        s = str(now) + ' 信息 ' +\
            ' '.join([str(i) for i in arg]) + '\n'
        f.write(s)

def LogProfit(p):
    now = int(time.time()*1000)
    with open(OUT_DATA_ROOT + INFO["value"], 'a', encoding='utf8') as f:
        f.write(str(now) + ' ' + str(p) + '\n')
    
    with open(OUT_DATA_ROOT + INFO["log"], 'a', encoding='utf8') as f:
        s = str(now) + ' 收益 ' +\
            str(p) + '\n'
        f.write(s)
    
def WriteINFO():
    with open(OUT_DATA_ROOT + OUT_DATA_INFO, 'w', encoding='utf8') as f:
        f.write(json.dumps(INFO))

def Sleep(ms):
    time.sleep(ms/1000)

def N_(v, n):
    return round(v, n)

def _init():
    now = int(time.time()*1000)
    nowstr = str(now)

    #备份旧的latest.info文件
    try:
        os.rename(OUT_DATA_ROOT + OUT_DATA_INFO, OUT_DATA_ROOT + 'info/' + nowstr + '.info')
    except:
        pass

    #写入latest.info
    back_frame = sys._getframe().f_back
    back_filename = os.path.basename(back_frame.f_code.co_filename)
    INFO["start"] = now
    INFO["file"] = back_filename
    INFO["value"] = 'value/' + nowstr + '.value'
    INFO["custom"]["file"] = 'custom/' + nowstr + '.custom'
    INFO["log"] = 'log/' + nowstr + '.log'
    WriteINFO()

_init()
