this.CABLES=this.CABLES||{},this.CABLES.COREMODULES=this.CABLES.COREMODULES||{},this.CABLES.COREMODULES.Vargetset=function(t){var e={};function i(r){if(e[r])return e[r].exports;var a=e[r]={i:r,l:!1,exports:{}};return t[r].call(a.exports,a,a.exports,i),a.l=!0,a.exports}return i.m=t,i.c=e,i.d=function(t,e,r){i.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},i.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},i.t=function(t,e){if(1&e&&(t=i(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(i.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var a in t)i.d(r,a,function(e){return t[e]}.bind(null,a));return r},i.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(e,"a",e),e},i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},i.p="",i(i.s=0)}([function(t,e){CABLES.VarSetOpWrapper=class{constructor(t,e,i,r,a,s){this._valuePort=i,this._varNamePort=r,this._op=t,this._type=e,this._triggerPort=a,this._nextPort=s,this._btnCreate=t.inTriggerButton("Create new variable"),this._btnCreate.setUiAttribs({hidePort:!0}),this._btnCreate.onTriggered=this._createVar.bind(this),this._helper=t.inUiTriggerButtons("",["Rename"]),this._helper.setUiAttribs({hidePort:!0}),this._helper.onTriggered=e=>{"Rename"==e&&CABLES.CMD.PATCH.renameVariable(t.varName.get())},this._op.setPortGroup("Variable",[this._helper,this._varNamePort,this._btnCreate]),this._op.on("uiParamPanel",this._updateVarNamesDropdown.bind(this)),this._op.patch.addEventListener("variablesChanged",this._updateName.bind(this)),this._op.patch.addEventListener("variableRename",this._renameVar.bind(this)),this._varNamePort.onChange=this._updateName.bind(this),this._valuePort.changeAlways=!0,this._triggerPort?this._triggerPort.onTriggered=()=>{this._setVarValue(!0)}:this._valuePort.onChange=this._setVarValue.bind(this),this._op.init=()=>{this._updateName(),this._triggerPort||this._setVarValue(),this._updateErrorUi()}}_updateErrorUi(){CABLES.UI&&(this._varNamePort.get()?this._op.setUiError("novarname",null):this._op.setUiError("novarname","no variable selected"))}_updateName(){const t=this._varNamePort.get();this._op.setTitle("var set "),this._op.setUiAttrib({extendTitle:"#"+t}),this._updateErrorUi();const e=this._op.patch.getVar(t);e&&!e.type&&(e.type=this._type),this._op.patch.hasVar(t)||0==t||this._triggerPort||this._setVarValue(),!this._op.patch.hasVar(t)&&0!=t&&this._triggerPort&&("string"==this._type||"number"==this._type?this._op.patch.setVarValue(t,""):this._op.patch.setVarValue(t,null)),this._op.isCurrentUiOp()&&(this._updateVarNamesDropdown(),this._op.refreshParams()),this._updateDisplay()}_createVar(){CABLES.CMD.PATCH.createVariable(this._op,this._type,()=>{this._updateName()})}_updateDisplay(){this._valuePort.setUiAttribs({greyout:!this._varNamePort.get()})}_updateVarNamesDropdown(){if(CABLES.UI){const t=[],e=this._op.patch.getVars();for(const i in e)e[i].type==this._type&&"0"!=i&&t.push(i);this._varNamePort.uiAttribs.values=t}}_renameVar(t,e){t==this._varNamePort.get()&&(this._varNamePort.set(e),this._updateName())}_setVarValue(t){const e=this._varNamePort.get();e&&("array"==this._type?(this._arr=[],CABLES.copyArray(this._valuePort.get(),this._arr),this._op.patch.setVarValue(e,null),this._op.patch.setVarValue(e,this._arr)):("object"==this._type&&this._op.patch.setVarValue(e,null),this._op.patch.setVarValue(e,this._valuePort.get())),t&&this._nextPort&&this._nextPort.trigger())}},CABLES.VarGetOpWrapper=class{constructor(t,e,i,r){this._op=t,this._type=e,this._varnamePort=i,this._variable=null,this._valueOutPort=r,this._op.on("uiParamPanel",this._updateVarNamesDropdown.bind(this)),this._op.patch.on("variableRename",this._renameVar.bind(this)),this._op.patch.on("variableDeleted",t=>{this._op.isCurrentUiOp()&&this._op.refreshParams()}),this._varnamePort.onChange=this._init.bind(this),this._op.patch.addEventListener("variablesChanged",this._init.bind(this)),this._op.onDelete=function(){this._variable&&this._variable.removeListener(this._setValueOut.bind(this))},this._op.init=()=>{this._init()}}_renameVar(t,e){t==this._varnamePort.get()&&(this._varnamePort.set(e),this._updateVarNamesDropdown())}_updateVarNamesDropdown(){if(CABLES.UI){const t=[],e=this._op.patch.getVars();for(const i in e)e[i].type==this._type&&"0"!=i&&t.push(i);this._op.varName.uiAttribs.values=t}}_setValueOut(t){this._updateVarNamesDropdown(),this._valueOutPort.set(t)}_init(){this._updateVarNamesDropdown(),this._variable&&this._variable.removeListener(this._setValueOut.bind(this)),this._variable=this._op.patch.getVar(this._op.varName.get()),this._variable?(this._variable.addListener(this._setValueOut.bind(this)),this._op.setUiError("unknownvar",null),this._op.setTitle("var get "),this._op.setUiAttrib({extendTitle:"#"+this._varnamePort.get()}),this._valueOutPort.set(this._variable.getValue())):(this._op.setUiError("unknownvar","unknown variable! - there is no setVariable with this name ("+this._varnamePort.get()+")"),this._op.setUiAttrib({extendTitle:"#invalid"}),this._valueOutPort.set(0))}}}]).Cables;