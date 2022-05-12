"use strict";

var CABLES=CABLES||{};
CABLES.OPS=CABLES.OPS||{};

var Ops=Ops || {};
Ops.Gl=Ops.Gl || {};
Ops.Anim=Ops.Anim || {};
Ops.Html=Ops.Html || {};
Ops.Math=Ops.Math || {};
Ops.Vars=Ops.Vars || {};
Ops.Array=Ops.Array || {};
Ops.Patch=Ops.Patch || {};
Ops.Value=Ops.Value || {};
Ops.Points=Ops.Points || {};
Ops.Boolean=Ops.Boolean || {};
Ops.Devices=Ops.Devices || {};
Ops.Trigger=Ops.Trigger || {};
Ops.Gl.Phong=Ops.Gl.Phong || {};
Ops.TimeLine=Ops.TimeLine || {};
Ops.WebAudio=Ops.WebAudio || {};
Ops.Gl.Matrix=Ops.Gl.Matrix || {};
Ops.Gl.Meshes=Ops.Gl.Meshes || {};
Ops.Gl.Shader=Ops.Gl.Shader || {};
Ops.Math.Compare=Ops.Math.Compare || {};
Ops.Devices.Mouse=Ops.Devices.Mouse || {};
Ops.Gl.ShaderEffects=Ops.Gl.ShaderEffects || {};
Ops.Gl.TextureEffects=Ops.Gl.TextureEffects || {};
Ops.Gl.TextureEffects.Noise=Ops.Gl.TextureEffects.Noise || {};



// **************************************************************
// 
// Ops.Gl.MainLoop
// 
// **************************************************************

Ops.Gl.MainLoop = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const fpsLimit = op.inValue("FPS Limit", 0);
const trigger = op.outTrigger("trigger");
const width = op.outValue("width");
const height = op.outValue("height");
const reduceFocusFPS = op.inValueBool("Reduce FPS not focussed", true);
const reduceLoadingFPS = op.inValueBool("Reduce FPS loading");
const clear = op.inValueBool("Clear", true);
const clearAlpha = op.inValueBool("ClearAlpha", true);
const fullscreen = op.inValueBool("Fullscreen Button", false);
const active = op.inValueBool("Active", true);
const hdpi = op.inValueBool("Hires Displays", false);

op.onAnimFrame = render;
hdpi.onChange = function ()
{
    if (hdpi.get()) op.patch.cgl.pixelDensity = window.devicePixelRatio;
    else op.patch.cgl.pixelDensity = 1;

    op.patch.cgl.updateSize();
    if (CABLES.UI) gui.setLayout();
};

active.onChange = function ()
{
    op.patch.removeOnAnimFrame(op);

    if (active.get())
    {
        op.setUiAttrib({ "extendTitle": "" });
        op.onAnimFrame = render;
        op.patch.addOnAnimFrame(op);
        op.log("adding again!");
    }
    else
    {
        op.setUiAttrib({ "extendTitle": "Inactive" });
    }
};

const cgl = op.patch.cgl;
let rframes = 0;
let rframeStart = 0;

if (!op.patch.cgl) op.uiAttr({ "error": "No webgl cgl context" });

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

fullscreen.onChange = updateFullscreenButton;
setTimeout(updateFullscreenButton, 100);
let fsElement = null;

let winhasFocus = true;
let winVisible = true;

window.addEventListener("blur", () => { winhasFocus = false; });
window.addEventListener("focus", () => { winhasFocus = true; });
document.addEventListener("visibilitychange", () => { winVisible = !document.hidden; });

function getFpsLimit()
{
    if (reduceLoadingFPS.get() && op.patch.loading.getProgress() < 1.0) return 5;

    if (reduceFocusFPS.get())
    {
        if (!winVisible) return 10;
        if (!winhasFocus) return 30;
    }

    return fpsLimit.get();
}

function updateFullscreenButton()
{
    function onMouseEnter()
    {
        if (fsElement)fsElement.style.display = "block";
    }

    function onMouseLeave()
    {
        if (fsElement)fsElement.style.display = "none";
    }

    op.patch.cgl.canvas.addEventListener("mouseleave", onMouseLeave);
    op.patch.cgl.canvas.addEventListener("mouseenter", onMouseEnter);

    if (fullscreen.get())
    {
        if (!fsElement)
        {
            fsElement = document.createElement("div");

            const container = op.patch.cgl.canvas.parentElement;
            if (container)container.appendChild(fsElement);

            fsElement.addEventListener("mouseenter", onMouseEnter);
            fsElement.addEventListener("click", function (e)
            {
                if (CABLES.UI && !e.shiftKey) gui.cycleFullscreen();
                else cgl.fullScreen();
            });
        }

        fsElement.style.padding = "10px";
        fsElement.style.position = "absolute";
        fsElement.style.right = "5px";
        fsElement.style.top = "5px";
        fsElement.style.width = "20px";
        fsElement.style.height = "20px";
        fsElement.style.cursor = "pointer";
        fsElement.style["border-radius"] = "40px";
        fsElement.style.background = "#444";
        fsElement.style["z-index"] = "9999";
        fsElement.style.display = "none";
        fsElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"Capa_1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 490 490\" style=\"width:20px;height:20px;\" xml:space=\"preserve\" width=\"512px\" height=\"512px\"><g><path d=\"M173.792,301.792L21.333,454.251v-80.917c0-5.891-4.776-10.667-10.667-10.667C4.776,362.667,0,367.442,0,373.333V480     c0,5.891,4.776,10.667,10.667,10.667h106.667c5.891,0,10.667-4.776,10.667-10.667s-4.776-10.667-10.667-10.667H36.416     l152.459-152.459c4.093-4.237,3.975-10.99-0.262-15.083C184.479,297.799,177.926,297.799,173.792,301.792z\" fill=\"#FFFFFF\"/><path d=\"M480,0H373.333c-5.891,0-10.667,4.776-10.667,10.667c0,5.891,4.776,10.667,10.667,10.667h80.917L301.792,173.792     c-4.237,4.093-4.354,10.845-0.262,15.083c4.093,4.237,10.845,4.354,15.083,0.262c0.089-0.086,0.176-0.173,0.262-0.262     L469.333,36.416v80.917c0,5.891,4.776,10.667,10.667,10.667s10.667-4.776,10.667-10.667V10.667C490.667,4.776,485.891,0,480,0z\" fill=\"#FFFFFF\"/><path d=\"M36.416,21.333h80.917c5.891,0,10.667-4.776,10.667-10.667C128,4.776,123.224,0,117.333,0H10.667     C4.776,0,0,4.776,0,10.667v106.667C0,123.224,4.776,128,10.667,128c5.891,0,10.667-4.776,10.667-10.667V36.416l152.459,152.459     c4.237,4.093,10.99,3.975,15.083-0.262c3.992-4.134,3.992-10.687,0-14.82L36.416,21.333z\" fill=\"#FFFFFF\"/><path d=\"M480,362.667c-5.891,0-10.667,4.776-10.667,10.667v80.917L316.875,301.792c-4.237-4.093-10.99-3.976-15.083,0.261     c-3.993,4.134-3.993,10.688,0,14.821l152.459,152.459h-80.917c-5.891,0-10.667,4.776-10.667,10.667s4.776,10.667,10.667,10.667     H480c5.891,0,10.667-4.776,10.667-10.667V373.333C490.667,367.442,485.891,362.667,480,362.667z\" fill=\"#FFFFFF\"/></g></svg>";
    }
    else
    {
        if (fsElement)
        {
            fsElement.style.display = "none";
            fsElement.remove();
            fsElement = null;
        }
    }
}

op.onDelete = function ()
{
    cgl.gl.clearColor(0, 0, 0, 0);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
};

function render(time)
{
    if (!active.get()) return;
    if (cgl.aborted || cgl.canvas.clientWidth === 0 || cgl.canvas.clientHeight === 0) return;

    const startTime = performance.now();

    op.patch.config.fpsLimit = getFpsLimit();

    if (cgl.canvasWidth == -1)
    {
        cgl.setCanvas(op.patch.config.glCanvasId);
        return;
    }

    if (cgl.canvasWidth != width.get() || cgl.canvasHeight != height.get())
    {
        width.set(cgl.canvasWidth);
        height.set(cgl.canvasHeight);
    }

    if (CABLES.now() - rframeStart > 1000)
    {
        CGL.fpsReport = CGL.fpsReport || [];
        if (op.patch.loading.getProgress() >= 1.0 && rframeStart !== 0)CGL.fpsReport.push(rframes);
        rframes = 0;
        rframeStart = CABLES.now();
    }
    CGL.MESH.lastShader = null;
    CGL.MESH.lastMesh = null;

    cgl.renderStart(cgl, identTranslate, identTranslateView);

    if (clear.get())
    {
        cgl.gl.clearColor(0, 0, 0, 1);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    }

    trigger.trigger();

    if (CGL.MESH.lastMesh)CGL.MESH.lastMesh.unBind();

    if (CGL.Texture.previewTexture)
    {
        if (!CGL.Texture.texturePreviewer) CGL.Texture.texturePreviewer = new CGL.Texture.texturePreview(cgl);
        CGL.Texture.texturePreviewer.render(CGL.Texture.previewTexture);
    }
    cgl.renderEnd(cgl);

    if (clearAlpha.get())
    {
        cgl.gl.clearColor(1, 1, 1, 1);
        cgl.gl.colorMask(false, false, false, true);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT);
        cgl.gl.colorMask(true, true, true, true);
    }

    if (!cgl.frameStore.phong)cgl.frameStore.phong = {};
    rframes++;

    op.patch.cgl.profileData.profileMainloopMs = performance.now() - startTime;
}


};

Ops.Gl.MainLoop.prototype = new CABLES.Op();
CABLES.OPS["b0472a1d-db16-4ba6-8787-f300fbdc77bb"]={f:Ops.Gl.MainLoop,objName:"Ops.Gl.MainLoop"};




// **************************************************************
// 
// Ops.Points.PointsSphereRandom
// 
// **************************************************************

Ops.Points.PointsSphereRandom = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    num=op.inValueInt("Amount of points",100),
    size=op.inValue("Sphere size",1),
    seed=op.inValue("Random seed",0),
    distRand=op.inValueSlider("Random distance from sphere",0),
    distrib=op.inValueSelect('Distribution',["Uniform","Poles","Half"],"Uniform"),
    outArray=op.outArray("Array out"),
    totalPointsOut=op.outNumber("Total points"),
    arrayLengthOut=op.outNumber("Array length");


var newArr=[];
outArray.set(newArr);

var newArr = [];

seed.onChange=
num.onChange=
size.onChange=
distrib.onChange=
distRand.onChange=outArray.onLinkChanged=generate;
generate();

function generate()
{

    const verts=[];
    verts.length=Math.max(0,Math.round(num.get())*3);

    Math.randomSeed=seed.get();

    var rndq = quat.create();
    var tempv = vec3.create();

    var dist=0;
    if(distrib.get()=="Poles")dist=1;
    if(distrib.get()=="Half")dist=2;

    var dRand=distRand.get();

    for(var i=0;i<num.get();i++)
    {
        if(dist==1 || dist==2)
        {
            rndq[0]=Math.seededRandom();
            rndq[1]=Math.seededRandom();
            rndq[2]=Math.seededRandom();
            rndq[3]=Math.seededRandom();
        }
        else
        {
            rndq[0]=Math.seededRandom()*2.0-1.0;
            rndq[1]=Math.seededRandom()*2.0-1.0;
            rndq[2]=Math.seededRandom()*2.0-1.0;
            rndq[3]=Math.seededRandom()*2.0-1.0;
        }

        quat.normalize(rndq,rndq);

        if(dist==2)
        {
            tempv[0]=size.get();
        }
        else
        {
            if(i%2===0) tempv[0]=-size.get();
                else tempv[0]=size.get();
        }

        tempv[1]=0;
        tempv[2]=0;

        if(dRand!==0) tempv[0]-=Math.random()*dRand;

        vec3.transformQuat(tempv, tempv, rndq) ;
        verts[i*3]=tempv[0];
        verts[i*3+1]=tempv[1];
        verts[i*3+2]=tempv[2];

    }

    outArray.set(null);
    outArray.set(verts);
    totalPointsOut.set(verts.length/3);
    arrayLengthOut.set(verts.length);
}



};

Ops.Points.PointsSphereRandom.prototype = new CABLES.Op();
CABLES.OPS["1ea17de7-adad-4053-943a-4874bccf54e9"]={f:Ops.Points.PointsSphereRandom,objName:"Ops.Points.PointsSphereRandom"};




// **************************************************************
// 
// Ops.Sequence
// 
// **************************************************************

Ops.Sequence = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe = op.inTrigger("exe"),
    cleanup = op.inTriggerButton("Clean up connections");

const
    exes = [],
    triggers = [],
    num = 16;

let updateTimeout = null;

exe.onTriggered = triggerAll;
cleanup.onTriggered = clean;
cleanup.setUiAttribs({ "hidePort": true });
cleanup.setUiAttribs({ "hideParam": true });

for (let i = 0; i < num; i++)
{
    const p = op.outTrigger("trigger " + i);
    triggers.push(p);
    p.onLinkChanged = updateButton;

    if (i < num - 1)
    {
        let newExe = op.inTrigger("exe " + i);
        newExe.onTriggered = triggerAll;
        exes.push(newExe);
    }
}

function updateButton()
{
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() =>
    {
        let show = false;
        for (let i = 0; i < triggers.length; i++)
            if (triggers[i].links.length > 1) show = true;

        cleanup.setUiAttribs({ "hideParam": !show });

        if (op.isCurrentUiOp()) op.refreshParams();
    }, 60);
}

function triggerAll()
{
    for (let i = 0; i < triggers.length; i++) triggers[i].trigger();
}

function clean()
{
    let count = 0;
    for (let i = 0; i < triggers.length; i++)
    {
        let removeLinks = [];

        if (triggers[i].links.length > 1)
            for (let j = 1; j < triggers[i].links.length; j++)
            {
                while (triggers[count].links.length > 0) count++;

                removeLinks.push(triggers[i].links[j]);
                const otherPort = triggers[i].links[j].getOtherPort(triggers[i]);
                op.patch.link(op, "trigger " + count, otherPort.parent, otherPort.name);
                count++;
            }

        for (let j = 0; j < removeLinks.length; j++) removeLinks[j].remove();
    }
    updateButton();
}


};

Ops.Sequence.prototype = new CABLES.Op();
CABLES.OPS["a466bc1f-06e9-4595-8849-bffb9fe22f99"]={f:Ops.Sequence,objName:"Ops.Sequence"};




// **************************************************************
// 
// Ops.Gl.Matrix.Transform
// 
// **************************************************************

Ops.Gl.Matrix.Transform = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    render = op.inTrigger("render"),
    posX = op.inValue("posX", 0),
    posY = op.inValue("posY", 0),
    posZ = op.inValue("posZ", 0),
    scale = op.inValue("scale", 1),
    rotX = op.inValue("rotX", 0),
    rotY = op.inValue("rotY", 0),
    rotZ = op.inValue("rotZ", 0),
    trigger = op.outTrigger("trigger");

op.setPortGroup("Rotation", [rotX, rotY, rotZ]);
op.setPortGroup("Position", [posX, posY, posZ]);
op.setPortGroup("Scale", [scale]);
op.setUiAxisPorts(posX, posY, posZ);

const cgl = op.patch.cgl;
const vPos = vec3.create();
const vScale = vec3.create();
const transMatrix = mat4.create();
mat4.identity(transMatrix);

let
    doScale = false,
    doTranslate = false,
    translationChanged = true,
    scaleChanged = true,
    rotChanged = true;

rotX.onChange = rotY.onChange = rotZ.onChange = setRotChanged;
posX.onChange = posY.onChange = posZ.onChange = setTranslateChanged;
scale.onChange = setScaleChanged;

render.onTriggered = function ()
{
    // if(!CGL.TextureEffect.checkOpNotInTextureEffect(op)) return;

    let updateMatrix = false;
    if (translationChanged)
    {
        updateTranslation();
        updateMatrix = true;
    }
    if (scaleChanged)
    {
        updateScale();
        updateMatrix = true;
    }
    if (rotChanged) updateMatrix = true;

    if (updateMatrix) doUpdateMatrix();

    cgl.pushModelMatrix();
    mat4.multiply(cgl.mMatrix, cgl.mMatrix, transMatrix);

    trigger.trigger();
    cgl.popModelMatrix();

    if (CABLES.UI && CABLES.UI.showCanvasTransforms) gui.setTransform(op.id, posX.get(), posY.get(), posZ.get());

    if (op.isCurrentUiOp())
        gui.setTransformGizmo(
            {
                "posX": posX,
                "posY": posY,
                "posZ": posZ,
            });
};

op.transform3d = function ()
{
    return { "pos": [posX, posY, posZ] };
};

function doUpdateMatrix()
{
    mat4.identity(transMatrix);
    if (doTranslate)mat4.translate(transMatrix, transMatrix, vPos);

    if (rotX.get() !== 0)mat4.rotateX(transMatrix, transMatrix, rotX.get() * CGL.DEG2RAD);
    if (rotY.get() !== 0)mat4.rotateY(transMatrix, transMatrix, rotY.get() * CGL.DEG2RAD);
    if (rotZ.get() !== 0)mat4.rotateZ(transMatrix, transMatrix, rotZ.get() * CGL.DEG2RAD);

    if (doScale)mat4.scale(transMatrix, transMatrix, vScale);
    rotChanged = false;
}

function updateTranslation()
{
    doTranslate = false;
    if (posX.get() !== 0.0 || posY.get() !== 0.0 || posZ.get() !== 0.0) doTranslate = true;
    vec3.set(vPos, posX.get(), posY.get(), posZ.get());
    translationChanged = false;
}

function updateScale()
{
    // doScale=false;
    // if(scale.get()!==0.0)
    doScale = true;
    vec3.set(vScale, scale.get(), scale.get(), scale.get());
    scaleChanged = false;
}

function setTranslateChanged()
{
    translationChanged = true;
}

function setScaleChanged()
{
    scaleChanged = true;
}

function setRotChanged()
{
    rotChanged = true;
}

doUpdateMatrix();


};

Ops.Gl.Matrix.Transform.prototype = new CABLES.Op();
CABLES.OPS["650baeb1-db2d-4781-9af6-ab4e9d4277be"]={f:Ops.Gl.Matrix.Transform,objName:"Ops.Gl.Matrix.Transform"};




// **************************************************************
// 
// Ops.Gl.Shader.PointMaterial_v4
// 
// **************************************************************

Ops.Gl.Shader.PointMaterial_v4 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={pointmat_frag:"\n{{MODULES_HEAD}}\n\nUNI vec4 color;\nIN vec2 texCoord;\nIN vec2 pointCoord;\nIN float ps;\n\n#ifdef HAS_TEXTURE_DIFFUSE\n    UNI sampler2D diffTex;\n#endif\n#ifdef HAS_TEXTURE_MASK\n    UNI sampler2D texMask;\n#endif\n#ifdef HAS_TEXTURE_COLORIZE\n    IN vec4 colorize;\n#endif\n#ifdef HAS_TEXTURE_OPACITY\n    IN float opacity;\n#endif\n#ifdef VERTEX_COLORS\n    IN vec4 vertexColor;\n#endif\n\nvoid main()\n{\n    #ifdef FLIP_TEX\n        vec2 pointCoord=vec2(gl_PointCoord.x,(1.0-gl_PointCoord.y));\n    #endif\n    #ifndef FLIP_TEX\n        vec2 pointCoord=gl_PointCoord;\n    #endif\n    {{MODULE_BEGIN_FRAG}}\n\n    if(ps<1.0)discard;\n\n    vec4 col=color;\n\n\n    #ifdef HAS_TEXTURE_MASK\n        float mask;\n        #ifdef TEXTURE_MASK_R\n            mask=texture(texMask,pointCoord).r;\n        #endif\n        #ifdef TEXTURE_MASK_A\n            mask=texture(texMask,pointCoord).a;\n        #endif\n        #ifdef TEXTURE_MASK_LUMI\n        \tvec3 lumcoeff = vec3(0.299,0.587,0.114);\n        \tmask = dot(texture(texMask,pointCoord).rgb, lumcoeff);\n        #endif\n\n    #endif\n\n    #ifdef HAS_TEXTURE_DIFFUSE\n        col=texture(diffTex,pointCoord);\n        #ifdef COLORIZE_TEXTURE\n          col.rgb*=color.rgb;\n        #endif\n    #endif\n    col.a*=color.a;\n\n    {{MODULE_COLOR}}\n\n    #ifdef MAKE_ROUND\n\n        #ifndef MAKE_ROUNDAA\n            if ((gl_PointCoord.x-0.5)*(gl_PointCoord.x-0.5) + (gl_PointCoord.y-0.5)*(gl_PointCoord.y-0.5) > 0.25) discard; //col.a=0.0;\n        #endif\n\n        #ifdef MAKE_ROUNDAA\n            float circ=(gl_PointCoord.x-0.5)*(gl_PointCoord.x-0.5) + (gl_PointCoord.y-0.5)*(gl_PointCoord.y-0.5);\n\n            float a=smoothstep(0.25,0.25-fwidth(gl_PointCoord.x),circ);\n            if(a==0.0)discard;\n            col.a=a*color.a;\n            // col.r=0.0;\n        #endif\n    #endif\n\n    #ifdef HAS_TEXTURE_COLORIZE\n        col*=colorize;\n    #endif\n\n    #ifdef TEXTURE_COLORIZE_MUL\n        col*=color;\n    #endif\n\n    #ifdef HAS_TEXTURE_MASK\n        col.a*=mask;\n    #endif\n\n    #ifdef HAS_TEXTURE_OPACITY\n        col.a*=opacity;\n    #endif\n\n\n    #ifdef VERTEX_COLORS\n        col.rgb = vertexColor.rgb;\n        col.a *= vertexColor.a;\n    #endif\n\n    if (col.a <= 0.0) discard;\n\n    #ifdef HAS_TEXTURE_COLORIZE\n        col*=colorize;\n    #endif\n\n    outColor = col;\n}\n",pointmat_vert:"{{MODULES_HEAD}}\nIN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN vec3 attrVertNormal;\nIN vec3 attrTangent;\nIN vec3 attrBiTangent;\n\n#ifdef VERTEX_COLORS\n    IN vec4 attrVertColor;\n    OUT vec4 vertexColor;\n#endif\n\nOUT vec3 norm;\nOUT float ps;\n\nOUT vec2 texCoord;\n\n\n#ifdef HAS_TEXTURES\n#endif\n\n#ifdef HAS_TEXTURE_COLORIZE\n   UNI sampler2D texColorize;\n   OUT vec4 colorize;\n#endif\n#ifdef HAS_TEXTURE_OPACITY\n    UNI sampler2D texOpacity;\n    OUT float opacity;\n#endif\n\n#ifdef HAS_TEXTURE_POINTSIZE\n   UNI sampler2D texPointSize;\n   UNI float texPointSizeMul;\n#endif\n\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\n\nUNI float pointSize;\nUNI vec3 camPos;\n\nUNI float canvasWidth;\nUNI float canvasHeight;\nUNI float camDistMul;\nUNI float randomSize;\n\nIN float attrVertIndex;\n\n\n\nfloat rand(float n){return fract(sin(n) * 5711.5711123);}\n\n#define POINTMATERIAL\n\nvoid main()\n{\n    norm=attrVertNormal;\n    #ifdef PIXELSIZE\n        float psMul=1.0;\n    #endif\n\n    #ifndef PIXELSIZE\n        float psMul=sqrt(canvasWidth/canvasHeight)+0.00000000001;\n    #endif\n\n    // float sizeMultiply=1.0;\n\n    vec3 tangent=attrTangent;\n    vec3 bitangent=attrBiTangent;\n\n\n    #ifdef VERTEX_COLORS\n        vertexColor=attrVertColor;\n    #endif\n\n    // #ifdef HAS_TEXTURES\n        texCoord=attrTexCoord;\n    // #endif\n\n    #ifdef HAS_TEXTURE_OPACITY\n        // opacity=texture(texOpacity,vec2(rand(attrVertIndex+texCoord.x*texCoord.y+texCoord.y+texCoord.x),rand(texCoord.y*texCoord.x-texCoord.x-texCoord.y-attrVertIndex))).r;\n        opacity=texture(texOpacity,texCoord).r;\n    #endif\n\n\n    #ifdef HAS_TEXTURE_COLORIZE\n        #ifdef RANDOM_COLORIZE\n            colorize=texture(texColorize,vec2(rand(attrVertIndex+texCoord.x*texCoord.y+texCoord.y+texCoord.x),rand(texCoord.y*texCoord.x-texCoord.x-texCoord.y-attrVertIndex)));\n        #endif\n        #ifndef RANDOM_COLORIZE\n            colorize=texture(texColorize,texCoord);\n        #endif\n    #endif\n\n\n\n\n\n    mat4 mMatrix=modelMatrix;\n    vec4 pos = vec4( vPosition, 1. );\n\n    gl_PointSize=0.0;\n\n    {{MODULE_VERTEX_POSITION}}\n\n    vec4 model=mMatrix * pos;\n\n    psMul+=rand(texCoord.x*texCoord.y+texCoord.y*3.0+texCoord.x*2.0+attrVertIndex)*randomSize;\n    // psMul*=sizeMultiply;\n\n    float addPointSize=0.0;\n    #ifdef HAS_TEXTURE_POINTSIZE\n\n        #ifdef POINTSIZE_CHAN_R\n            addPointSize=texture(texPointSize,texCoord).r;\n        #endif\n        #ifdef POINTSIZE_CHAN_G\n            addPointSize=texture(texPointSize,texCoord).g;\n        #endif\n        #ifdef POINTSIZE_CHAN_B\n            addPointSize=texture(texPointSize,texCoord).b;\n        #endif\n\n\n        #ifdef DOTSIZEREMAPABS\n            // addPointSize=(( (texture(texPointSize,texCoord).r) * texPointSizeMul)-0.5)*2.0;\n\n            addPointSize=1.0-(distance(addPointSize,0.5)*2.0);\n            // addPointSize=abs(1.0-(distance(addPointSize,0.5)*2.0));\n            addPointSize=addPointSize*addPointSize*addPointSize*2.0;\n\n            // addPointSize=(( (texture(texPointSize,texCoord).r) * texPointSizeMul)-0.5)*2.0;\n        #endif\n\n        addPointSize*=texPointSizeMul;\n\n    #endif\n\n    ps=0.0;\n    #ifndef SCALE_BY_DISTANCE\n        ps = (pointSize+addPointSize) * psMul;\n    #endif\n    #ifdef SCALE_BY_DISTANCE\n        float cameraDist = distance(model.xyz, camPos);\n        ps = ( (pointSize+addPointSize) / cameraDist) * psMul;\n    #endif\n\n    gl_PointSize += ps;\n\n\n    gl_Position = projMatrix * viewMatrix * model;\n}\n",};
const cgl = op.patch.cgl;

const
    render = op.inTrigger("render"),
    pointSize = op.inValueFloat("PointSize", 3),
    inPixelSize = op.inBool("Size in Pixels", false),
    randomSize = op.inValue("Random Size", 0),
    makeRound = op.inValueBool("Round", true),
    makeRoundAA = op.inValueBool("Round Antialias", false),
    doScale = op.inValueBool("Scale by Distance", false),
    r = op.inValueSlider("r", Math.random()),
    g = op.inValueSlider("g", Math.random()),
    b = op.inValueSlider("b", Math.random()),
    a = op.inValueSlider("a", 1),
    vertCols = op.inBool("Vertex Colors", false),
    texture = op.inTexture("texture"),
    textureMulColor = op.inBool("Colorize Texture"),
    textureMask = op.inTexture("Texture Mask"),
    texMaskChan = op.inSwitch("Mask Channel", ["R", "A", "Luminance"], "R"),
    textureColorize = op.inTexture("Texture Colorize"),
    colorizeRandom = op.inValueBool("Colorize Randomize", true),
    textureOpacity = op.inTexture("Texture Opacity"),
    texturePointSize = op.inTexture("Texture Point Size"),
    texturePointSizeChannel = op.inSwitch("Point Size Channel", ["R", "G", "B"], "R"),
    texturePointSizeMul = op.inFloat("Texture Point Size Mul", 1),
    texturePointSizeMap = op.inSwitch("Map Size 0", ["Black", "Grey"], "Black"),
    flipTex = op.inValueBool("Flip Texture", false),

    trigger = op.outTrigger("trigger"),
    shaderOut = op.outObject("shader");

op.setPortGroup("Texture", [texture, textureMulColor, textureMask, texMaskChan, textureColorize, textureOpacity, colorizeRandom]);

op.setPortGroup("Color", [r, g, b, a, vertCols]);
op.setPortGroup("Size", [pointSize, randomSize, makeRound, makeRoundAA, doScale, inPixelSize, texturePointSize, texturePointSizeMul, texturePointSizeChannel]);
r.setUiAttribs({ "colorPick": true });

const shader = new CGL.Shader(cgl, "PointMaterial");
shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);
shader.define("MAKE_ROUND");

const
    uniPointSize = new CGL.Uniform(shader, "f", "pointSize", pointSize),
    texturePointSizeMulUniform = new CGL.Uniform(shader, "f", "texPointSizeMul", texturePointSizeMul),
    uniRandomSize = new CGL.Uniform(shader, "f", "randomSize", randomSize),
    uniColor = new CGL.Uniform(shader, "4f", "color", r, g, b, a),
    uniWidth = new CGL.Uniform(shader, "f", "canvasWidth", cgl.canvasWidth),
    uniHeight = new CGL.Uniform(shader, "f", "canvasHeight", cgl.canvasHeight),
    textureUniform = new CGL.Uniform(shader, "t", "diffTex"),
    textureColorizeUniform = new CGL.Uniform(shader, "t", "texColorize"),
    textureOpacityUniform = new CGL.Uniform(shader, "t", "texOpacity"),
    textureColoPointSize = new CGL.Uniform(shader, "t", "texPointSize"),
    texturePointSizeUniform = new CGL.Uniform(shader, "t", "texPointSize"),
    textureMaskUniform = new CGL.Uniform(shader, "t", "texMask");

shader.setSource(attachments.pointmat_vert, attachments.pointmat_frag);
shader.glPrimitive = cgl.gl.POINTS;
shaderOut.set(shader);
shaderOut.ignoreValueSerialize = true;

render.onTriggered = doRender;
doScale.onChange =
    makeRound.onChange =
    makeRoundAA.onChange =
    texture.onChange =
    textureColorize.onChange =
    textureMask.onChange =
    colorizeRandom.onChange =
    flipTex.onChange =
    texMaskChan.onChange =
    inPixelSize.onChange =
    textureOpacity.onChange =
    texturePointSize.onChange =
    texturePointSizeMap.onChange =
    texturePointSizeChannel.onChange =
    textureMulColor.onChange =
    vertCols.onChange = updateDefines;

op.preRender = function ()
{
    if (shader)shader.bind();
    doRender();
};

function doRender()
{
    uniWidth.setValue(cgl.canvasWidth);
    uniHeight.setValue(cgl.canvasHeight);

    cgl.pushShader(shader);
    shader.popTextures();
    if (texture.get() && !texture.get().deleted) shader.pushTexture(textureUniform, texture.get());
    if (textureMask.get()) shader.pushTexture(textureMaskUniform, textureMask.get());
    if (textureColorize.get()) shader.pushTexture(textureColorizeUniform, textureColorize.get());
    if (textureOpacity.get()) shader.pushTexture(textureOpacityUniform, textureOpacity.get());
    if (texturePointSize.get()) shader.pushTexture(texturePointSizeUniform, texturePointSize.get());

    trigger.trigger();

    cgl.popShader();
}

function updateDefines()
{
    shader.toggleDefine("SCALE_BY_DISTANCE", doScale.get());
    shader.toggleDefine("MAKE_ROUND", makeRound.get());
    shader.toggleDefine("MAKE_ROUNDAA", makeRoundAA.get());

    shader.toggleDefine("VERTEX_COLORS", vertCols.get());
    shader.toggleDefine("RANDOM_COLORIZE", colorizeRandom.get());
    shader.toggleDefine("HAS_TEXTURE_DIFFUSE", texture.get());
    shader.toggleDefine("HAS_TEXTURE_MASK", textureMask.get());
    shader.toggleDefine("HAS_TEXTURE_COLORIZE", textureColorize.get());
    shader.toggleDefine("HAS_TEXTURE_OPACITY", textureOpacity.get());
    shader.toggleDefine("HAS_TEXTURE_POINTSIZE", texturePointSize.get());

    shader.toggleDefine("TEXTURE_COLORIZE_MUL", textureMulColor.get());

    shader.toggleDefine("FLIP_TEX", flipTex.get());
    shader.toggleDefine("TEXTURE_MASK_R", texMaskChan.get() == "R");
    shader.toggleDefine("TEXTURE_MASK_A", texMaskChan.get() == "A");
    shader.toggleDefine("TEXTURE_MASK_LUMI", texMaskChan.get() == "Luminance");
    shader.toggleDefine("PIXELSIZE", inPixelSize.get());

    shader.toggleDefine("POINTSIZE_CHAN_R", texturePointSizeChannel.get() == "R");
    shader.toggleDefine("POINTSIZE_CHAN_G", texturePointSizeChannel.get() == "G");
    shader.toggleDefine("POINTSIZE_CHAN_B", texturePointSizeChannel.get() == "B");

    shader.toggleDefine("DOTSIZEREMAPABS", texturePointSizeMap.get() == "Grey");
}


};

Ops.Gl.Shader.PointMaterial_v4.prototype = new CABLES.Op();
CABLES.OPS["a7cb5d1c-cd4a-4c28-bb13-7bb9bda187ed"]={f:Ops.Gl.Shader.PointMaterial_v4,objName:"Ops.Gl.Shader.PointMaterial_v4"};




// **************************************************************
// 
// Ops.Gl.Meshes.PointCloudFromArray
// 
// **************************************************************

Ops.Gl.Meshes.PointCloudFromArray = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe = op.inTrigger("exe"),
    arr = op.inArray("Array", 3),
    numPoints = op.inValueInt("Num Points"),
    outTrigger = op.outTrigger("Trigger out"),
    outGeom = op.outObject("Geometry"),
    pTexCoordRand = op.inValueBool("Scramble Texcoords", true),
    seed = op.inValue("Seed"),
    inCoords = op.inArray("Coordinates", 2),
    vertCols = op.inArray("Vertex Colors", 4);

const cgl = op.patch.cgl;

inCoords.onChange = updateTexCoordsPorts;
pTexCoordRand.onChange = updateTexCoordsPorts;

vertCols.onChange = seed.onChange = arr.onChange = reset;
numPoints.onChange = updateNumVerts;

op.toWorkPortsNeedToBeLinked(arr, exe);

op.setPortGroup("Texture Coordinates", [pTexCoordRand, seed, inCoords]);

let deactivated = false;

exe.onTriggered = doRender;

let mesh = null;
const geom = new CGL.Geometry("pointcloudfromarray");
let texCoords = [];
let needsRebuild = true;

let showingError = false;

function doRender()
{
    outTrigger.trigger();
    if (CABLES.UI)
    {
        let shader = cgl.getShader();
        if (shader.glPrimitive != cgl.gl.POINTS) op.setUiError("nopointmat", "Using a Material not made for point rendering. Try to use PointMaterial.");
        else op.setUiError("nopointmat", null);
    }

    if (needsRebuild || !mesh)rebuild();
    if (!deactivated && mesh) mesh.render(cgl.getShader());
}

function reset()
{
    deactivated = arr.get() == null;

    if (!deactivated)needsRebuild = true;
    else needsRebuild = false;
}

function updateTexCoordsPorts()
{
    if (inCoords.isLinked())
    {
        seed.setUiAttribs({ "greyout": true });
        pTexCoordRand.setUiAttribs({ "greyout": true });
    }
    else
    {
        pTexCoordRand.setUiAttribs({ "greyout": false });

        if (!pTexCoordRand.get()) seed.setUiAttribs({ "greyout": true });
        else seed.setUiAttribs({ "greyout": false });
    }

    mesh = null;
    needsRebuild = true;
}

function updateNumVerts()
{
    if (mesh)
    {
        mesh.setNumVertices(Math.min(geom.vertices.length / 3, numPoints.get()));
        if (numPoints.get() == 0)mesh.setNumVertices(geom.vertices.length / 3);
    }
}

function rebuild()
{
    let verts = arr.get();

    if (!verts || verts.length == 0)
    {
        // mesh=null;
        return;
    }

    if (verts.length % 3 !== 0)
    {
        // if (!showingError)
        // {
        op.setUiError("div3", "Array length not multiple of 3");

        // op.uiAttr({ "error": "Array length not divisible by 3!" });
        // showingError = true;
        // }
        return;
    }
    else op.setUiError("div3", null);

    if (geom.vertices.length == verts.length && mesh && !inCoords.isLinked() && !vertCols.isLinked())
    {
        mesh.setAttribute(CGL.SHADERVAR_VERTEX_POSITION, verts, 3);
        geom.vertices = verts;
        needsRebuild = false;
        return;
    }

    geom.clear();
    let num = verts.length / 3;
    num = Math.abs(Math.floor(num));

    if (num == 0) return;

    if (!texCoords || texCoords.length != num * 2) texCoords = new Float32Array(num * 2); // num*2;//=

    let changed = true;
    let rndTc = pTexCoordRand.get();

    if (!inCoords.isLinked())
    {
        Math.randomSeed = seed.get();
        texCoords = []; // needed otherwise its using the reference to input incoords port
        // let genCoords = !inCoords.isLinked();

        for (let i = 0; i < num; i++)
        {
            if (geom.vertices[i * 3] != verts[i * 3] ||
                geom.vertices[i * 3 + 1] != verts[i * 3 + 1] ||
                geom.vertices[i * 3 + 2] != verts[i * 3 + 2])
            {
                // if (genCoords)
                if (rndTc)
                {
                    texCoords[i * 2] = Math.seededRandom();
                    texCoords[i * 2 + 1] = Math.seededRandom();
                }
                else
                {
                    texCoords[i * 2] = i / num;
                    texCoords[i * 2 + 1] = i / num;
                }
            }
        }
    }

    if (vertCols.get())
    {
        if (!showingError && vertCols.get().length != num * 4)
        {
            op.uiAttr({ "error": "Color array does not have the correct length! (should be " + num * 4 + ")" });
            showingError = true;
            mesh = null;
            return;
        }

        geom.vertexColors = vertCols.get();
    }
    else geom.vertexColors = [];

    console.log("changed", changed);

    if (changed)
    {
        if (inCoords.isLinked()) texCoords = inCoords.get();

        // console.log(texCoords,inCoords.isLinked());

        geom.setPointVertices(verts);
        geom.setTexCoords(texCoords);
        geom.verticesIndices = [];

        if (mesh)mesh.dispose();
        mesh = new CGL.Mesh(cgl, geom, cgl.gl.POINTS);

        mesh.addVertexNumbers = true;
        mesh.setGeom(geom);
        outGeom.set(geom);
    }

    updateNumVerts();
    needsRebuild = false;
}


};

Ops.Gl.Meshes.PointCloudFromArray.prototype = new CABLES.Op();
CABLES.OPS["0a6d9c6f-6459-45ca-88ad-268a1f7304db"]={f:Ops.Gl.Meshes.PointCloudFromArray,objName:"Ops.Gl.Meshes.PointCloudFromArray"};




// **************************************************************
// 
// Ops.WebAudio.AudioBuffer_v2
// 
// **************************************************************

Ops.WebAudio.AudioBuffer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const cgl = op.patch.cgl;

const
    audioCtx = CABLES.WEBAUDIO.createAudioContext(op),
    inUrlPort = op.inUrl("URL", "audio"),
    inLoadingTask = op.inBool("Create Loading Task", true),
    audioBufferPort = op.outObject("Audio Buffer", null, "audioBuffer"),
    finishedLoadingPort = op.outValue("Finished Loading", false),
    sampleRatePort = op.outValue("Sample Rate", 0),
    lengthPort = op.outValue("Length", 0),
    durationPort = op.outValue("Duration", 0),
    numberOfChannelsPort = op.outValue("Number of Channels", 0),
    outLoading = op.outBool("isLoading", 0);

let currentBuffer = null;
let isLoading = false;
let currentFileUrl = null;
let urlToLoadNext = null;
let clearAfterLoad = false;
let fromData = false;
let fromDataNew = false;
let fileReader = new FileReader();
let arrayBuffer = null;
let loadingIdDataURL = 0;

if (!audioBufferPort.isLinked())
{
    op.setUiError("notConnected", "To play back sound, connect this op to a playback operator such as SamplePlayer or AudioBufferPlayer.", 0);
}
else
{
    op.setUiError("notConnected", null);
}

audioBufferPort.onLinkChanged = () =>
{
    if (audioBufferPort.isLinked())
    {
        op.setUiError("notConnected", null);
    }
    else
    {
        op.setUiError("notConnected", "To play back sound, connect this op to a playback operator such as SamplePlayer or AudioBufferPlayer.", 0);
    }
};

function loadAudioFile(url, loadFromData)
{
    currentFileUrl = url;
    isLoading = true;
    outLoading.set(isLoading);

    if (!loadFromData)
    {
        const ext = url.substr(url.lastIndexOf(".") + 1);
        if (ext === "wav")
        {
            op.setUiError("wavFormat", "You are using a .wav file. Make sure the .wav file is 16 bit to be supported by all browsers. Safari does not support 24 bit .wav files.", 1);
        }
        else
        {
            op.setUiError("wavFormat", null);
        }

        CABLES.WEBAUDIO.loadAudioFile(op.patch, url, onLoadFinished, onLoadFailed, inLoadingTask.get());
    }
    else
    {
        let fileBlob = dataURItoBlob(url);

        if (fileBlob.type === "audio/wav")
        {
            op.setUiError("wavFormat", "You are using a .wav file. Make sure the .wav file is 16 bit to be supported by all browsers. Safari does not support 24 bit .wav files.", 1);
        }
        else
        {
            op.setUiError("wavFormat", null);
        }

        if (inLoadingTask.get())
        {
            loadingIdDataURL = cgl.patch.loading.start("audiobuffer from data-url " + op.id, "");
            if (cgl.patch.isEditorMode()) gui.jobs().start({ "id": "loadaudio" + loadingIdDataURL, "title": " loading audio data url (" + op.id + ")" });
        }

        fileReader.readAsArrayBuffer(fileBlob);
    }
}

function dataURItoBlob(dataURI)
{
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    let byteString = atob(dataURI.split(",")[1]);

    // separate out the mime component
    let mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

    // write the bytes of the string to an ArrayBuffer
    let ab = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    let ia = new Uint8Array(ab);

    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++)
    {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    let blob = new Blob([ab], { "type": mimeString });
    return blob;
}

// change listeners
inUrlPort.onChange = function ()
{
    if (inUrlPort.get())
    {
        fromData = String(inUrlPort.get()).indexOf("data:") == 0;

        if (isLoading)
        {
            fromDataNew = String(inUrlPort.get()).indexOf("data:") == 0;
            const newUrl = fromDataNew ? inUrlPort.get() : op.patch.getFilePath(inUrlPort.get());
            if (newUrl !== currentFileUrl)
            {
                urlToLoadNext = newUrl;
            }
            else
            {
                urlToLoadNext = null;
            }

            clearAfterLoad = false;
            return;
        }

        invalidateOutPorts();
        const url = fromData ? inUrlPort.get() : op.patch.getFilePath(inUrlPort.get());

        loadAudioFile(url, fromData);
    }
    else
    {
        if (isLoading)
        {
            clearAfterLoad = true;
            return;
        }
        invalidateOutPorts();
        op.setUiError("wavFormat", null);
        op.setUiError("failedLoading", null);
    }
};

fileReader.onloadend = () =>
{
    arrayBuffer = fileReader.result;
    cgl.patch.loading.finished(loadingIdDataURL);
    if (cgl.patch.isEditorMode()) gui.jobs().finish("loadaudio" + loadingIdDataURL);
    loadFromDataURL();
};

function loadFromDataURL()
{
    if (arrayBuffer) audioCtx.decodeAudioData(arrayBuffer, onLoadFinished, onLoadFailed);
}

function onLoadFinished(buffer)
{
    isLoading = false;
    outLoading.set(isLoading);

    if (clearAfterLoad)
    {
        invalidateOutPorts();
        clearAfterLoad = false;
        return;
    }

    if (urlToLoadNext)
    {
        loadAudioFile(urlToLoadNext, fromDataNew);
        urlToLoadNext = null;
    }
    else
    {
        currentBuffer = buffer;
        lengthPort.set(buffer.length);
        durationPort.set(buffer.duration);
        numberOfChannelsPort.set(buffer.numberOfChannels);
        sampleRatePort.set(buffer.sampleRate);
        audioBufferPort.set(buffer);
        op.setUiError("failedLoading", null);
        finishedLoadingPort.set(true);
        fromData = false;
        fromDataNew = false;
    }
}

function onLoadFailed(e)
{
    op.logError("Error: Loading audio file failed: ", e);
    op.setUiError("failedLoading", "The audio file could not be loaded. Make sure the right file URL is used.", 2);
    isLoading = false;
    invalidateOutPorts();
    outLoading.set(isLoading);
    currentBuffer = null;

    if (urlToLoadNext)
    {
        loadAudioFile(urlToLoadNext, fromDataNew);
        urlToLoadNext = null;
    }
}

function invalidateOutPorts()
{
    lengthPort.set(0);
    durationPort.set(0);
    numberOfChannelsPort.set(0);
    sampleRatePort.set(0);

    audioBufferPort.set(null);

    finishedLoadingPort.set(false);
}


};

Ops.WebAudio.AudioBuffer_v2.prototype = new CABLES.Op();
CABLES.OPS["5f1d6a2f-1c04-4744-b0fb-910825beceee"]={f:Ops.WebAudio.AudioBuffer_v2,objName:"Ops.WebAudio.AudioBuffer_v2"};




// **************************************************************
// 
// Ops.WebAudio.AudioBufferPlayer_v2
// 
// **************************************************************

Ops.WebAudio.AudioBufferPlayer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
// input ports
const audioBufferPort = op.inObject("Audio Buffer", null, "audioBuffer");
const playPort = op.inBool("Start / Stop", false);
const autoPlayPort = op.inBool("Autoplay", false);
const loopPort = op.inBool("Loop", false);
const inResetStart = op.inTriggerButton("Restart");
const startTimePort = op.inFloat("Start Time", 0);
const stopTimePort = op.inFloat("Stop Time", 0);
const offsetPort = op.inFloat("Offset", 0);
const playbackRatePort = op.inFloat("Playback Rate", 1);
const detunePort = op.inFloat("Detune", 0);

op.setPortGroup("Playback Controls", [playPort, autoPlayPort, loopPort, inResetStart]);
op.setPortGroup("Time Controls", [startTimePort, stopTimePort, offsetPort]);
op.setPortGroup("Miscellaneous", [playbackRatePort, detunePort]);

// output ports
const audioOutPort = op.outObject("Audio Out", null, "audioNode");
const outPlaying = op.outBool("Is Playing", false);
const outLoading = op.outBool("Loading", false);

// vars
let source = null;
let isPlaying = false;
let hasEnded = false;
let pausedAt = null;
let startedAt = null;
let isLoading = false;

const audioCtx = CABLES.WEBAUDIO.createAudioContext(op);

const gainNode = audioCtx.createGain();

if (!audioBufferPort.isLinked())
{
    op.setUiError("inputNotConnected", "To be able to play back sound, you need to connect an AudioBuffer to this op.", 0);
}
else
{
    op.setUiError("inputNotConnected", null);
}

audioBufferPort.onLinkChanged = () =>
{
    if (!audioBufferPort.isLinked())
    {
        op.setUiError("inputNotConnected", "To be able to play back sound, you need to connect an AudioBuffer to this op.", 0);
    }
    else
    {
        op.setUiError("inputNotConnected", null);
    }
};

if (!audioOutPort.isLinked())
{
    op.setUiError("outputNotConnected", "To be able to hear sound playing, you need to connect this op to an Output op.", 0);
}
else
{
    op.setUiError("outputNotConnected", null);
}

audioOutPort.onLinkChanged = () =>
{
    if (!audioOutPort.isLinked())
    {
        op.setUiError("outputNotConnected", "To be able to hear sound playing, you need to connect this op to an Output op.", 0);
    }
    else
    {
        op.setUiError("outputNotConnected", null);
    }
};

// change listeners
audioBufferPort.onChange = function ()
{
    if (audioBufferPort.get()) createAudioBufferSource();
    else
    {
        if (isLoading)
        {
            isLoading = false;
            outLoading.set(isLoading);
        }

        if (isPlaying)
        {
            stop(0);
            source.buffer = null;
            source = null;
        }
    }
};

playPort.onChange = function ()
{
    if (!audioBufferPort.get()) return;

    if (!source)
    {
        if (!isLoading) createAudioBufferSource();
    }

    if (playPort.get())
    {
        const startTime = startTimePort.get() || 0;
        start(startTime);
    }
    else
    {
        const stopTime = stopTimePort.get() || 0;
        stop(stopTime);
    }
};

loopPort.onChange = function ()
{
    if (source)
    {
        source.loop = !!loopPort.get();
    }
};

detunePort.onChange = setDetune;

function setDetune()
{
    if (!source) return;

    const detune = detunePort.get() || 0;
    if (source.detune)
    {
        source.detune.setValueAtTime(
            detune,
            audioCtx.currentTime
        );
    }
}

playbackRatePort.onChange = setPlaybackRate;

function setPlaybackRate()
{
    if (!source) return;

    const playbackRate = playbackRatePort.get() || 0;
    if (playbackRate >= source.playbackRate.minValue && playbackRate <= source.playbackRate.maxValue)
    {
        source.playbackRate.setValueAtTime(
            playbackRate,
            audioCtx.currentTime
        );
    }
}

let resetTriggered = false;
inResetStart.onTriggered = function ()
{
    if (!source) return;
    if (!audioBufferPort.get()) return;
    else
    {
        if (!(audioBufferPort.get() instanceof AudioBuffer)) return;
    }

    if (playPort.get())
    {
        if (isPlaying)
        {
            stop(0);
            resetTriggered = true;
        }
        else
        {
            start(startTimePort.get());
        }
    }
};

// functions
function createAudioBufferSource(dontStart = false)
{
    if (isLoading) return;
    if (!(audioBufferPort.get() instanceof AudioBuffer)) return;

    isLoading = true;
    outLoading.set(isLoading);

    if (source)
    {
        source.onended = null;

        if (source.buffer)
        {
            stop(0);
            source.disconnect(gainNode);
            source.buffer = null;
        }

        source = null;
    }

    source = audioCtx.createBufferSource();

    const buffer = audioBufferPort.get();

    if (!buffer)
    {
        isLoading = false;
        outLoading.set(isLoading);
        return;
    }

    source.buffer = buffer;
    source.onended = onPlaybackEnded;
    source.loop = loopPort.get();

    source.connect(gainNode);
    setPlaybackRate();
    setDetune();
    audioOutPort.set(gainNode);

    isLoading = false;
    outLoading.set(isLoading);

    if (resetTriggered)
    {
        start(startTimePort.get());
        resetTriggered = false;
        return;
    }

    if (playPort.get() && !dontStart)
    {
        // if (!isPlaying)
        start(startTimePort.get());
    }
}

let timeOuting = false;
let timerId = null;

offsetPort.onChange = () =>
{
    if (offsetPort.get() >= 0) op.setUiError("offsetNegative", null);
    else
    {
        op.setUiError("offsetNegative", "Offset cannot be negative. Setting to 0.", 1);
    }

    if (source)
    {
        if (source.buffer)
        {
            if (offsetPort.get() > source.buffer.duration)
            {
                op.setUiError("offsetTooLong", "Your offset value is higher than the total time of your audio file. Please decrease the duration to be able to hear sound when playing back your buffer.", 1);
            }
            else
            {
                op.setUiError("offsetTooLong", null);
            }
        }
    }
};

function start(time)
{
    try
    {
        let offset = 0;
        if (source)
        {
            source.start(time, Math.max(0, offsetPort.get())); // 0 = now

            isPlaying = true;
            hasEnded = false;
            outPlaying.set(true);
        }
        else
        {
            op.log("start() but no src...");
        }
    }
    catch (e)
    {
        op.log("Error on start: ", e.message);
        outPlaying.set(false);

        isPlaying = false;
    }
}

function recreateBuffer()
{
    let dontStart = !loopPort.get();
    createAudioBufferSource(dontStart);
}

function stop(time)
{
    try
    {
        if (source)
        {
            source.stop();
            recreateBuffer();
        }

        isPlaying = false;
        outPlaying.set(false);
    }
    catch (e)
    {
        op.setUiError(e);
        outPlaying.set(false);
    }
}

function onPlaybackEnded()
{
    isPlaying = false;
    hasEnded = true;
    if (loopPort.get())
    {
        isPlaying = true;
        hasEnded = false;
    }
    outPlaying.set(isPlaying);

    recreateBuffer();
}


};

Ops.WebAudio.AudioBufferPlayer_v2.prototype = new CABLES.Op();
CABLES.OPS["3abd0dbb-eeee-4c65-ae31-b8bc2345e2d5"]={f:Ops.WebAudio.AudioBufferPlayer_v2,objName:"Ops.WebAudio.AudioBufferPlayer_v2"};




// **************************************************************
// 
// Ops.WebAudio.AudioAnalyzer_v2
// 
// **************************************************************

Ops.WebAudio.AudioAnalyzer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const MAX_DBFS_RANGE_24_BIT = -144;
const MAX_DBFS_RANGE_26_BIT = -96;

let audioCtx = CABLES.WEBAUDIO.createAudioContext(op);

const inTrigger = op.inTrigger("Trigger In");

const analyser = audioCtx.createAnalyser();
analyser.smoothingTimeConstant = 0.3;
analyser.fftSize = 256;

const FFT_BUFFER_SIZES = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];

const audioIn = op.inObject("Audio In", null, "audioNode");
const inFFTSize = op.inDropDown("FFT size", FFT_BUFFER_SIZES, 256);
const inSmoothing = op.inFloatSlider("Smoothing", 0.3);

const inRangeMin = op.inFloat("Min", -90);
const inRangeMax = op.inFloat("Max", 0);

op.setPortGroup("Inputs", [inTrigger, audioIn]);
op.setPortGroup("FFT Options", [inFFTSize, inSmoothing]);
op.setPortGroup("Range (in dBFS)", [inRangeMin, inRangeMax]);
const outTrigger = op.outTrigger("Trigger Out");
const audioOut = op.outObject("Audio Out", null, "audioNode");
const fftOut = op.outArray("FFT Array");
const ampOut = op.outArray("Waveform Array");
const frequencyOut = op.outArray("Frequencies by Index Array");
const fftLength = op.outNumber("Array Length");
const avgVolumePeak = op.outNumber("Average Volume");
const avgVolumeAmp = op.outNumber("Average Volume Time-Domain");
const avgVolumeRMS = op.outNumber("RMS Volume");
let updating = false;

let fftBufferLength = analyser.frequencyBinCount;
let fftDataArray = new Uint8Array(fftBufferLength);
let ampDataArray = new Uint8Array(fftBufferLength);
let frequencyArray = [];
frequencyArray.length = fftBufferLength;
let oldAudioIn = null;

audioIn.onChange = () =>
{
    if (audioIn.get())
    {
        const audioNode = audioIn.get();
        if (audioNode.connect)
        {
            audioNode.connect(analyser);
            audioOut.set(analyser);
        }
    }
    else
    {
        if (oldAudioIn)
        {
            if (oldAudioIn.disconnect) oldAudioIn.disconnect(analyser);
            audioOut.set(null);
        }
    }

    oldAudioIn = audioIn.get();
};

function updateAnalyser()
{
    try
    {
        const fftSize = Number(inFFTSize.get());
        analyser.smoothingTimeConstant = clamp(inSmoothing.get(), 0.0, 1.0);
        analyser.fftSize = fftSize;
        const minDecibels = clamp(inRangeMin.get(), MAX_DBFS_RANGE_24_BIT, -0.0001);
        const maxDecibels = Math.max(inRangeMax.get(), analyser.minDecibels + 0.0001);
        analyser.minDecibels = minDecibels;
        analyser.maxDecibels = maxDecibels;

        if (minDecibels < MAX_DBFS_RANGE_24_BIT)
        {
            op.setUiError("maxDbRangeMin",
                "Your minimum is below the lowest possible dBFS value: "
                + MAX_DBFS_RANGE_24_BIT
                + "dBFS. To make sure your analyser data is correct, try increasing the minimum.",
                1
            );
        }
        else
        {
            op.setUiError("maxDbRangeMin", null);
        }

        if (maxDecibels > 0)
        {
            op.setUiError("maxDbRangeMax", "Your maximum is above 0 dBFS. As digital signals only go to 0 dBFS and not above, you should use 0 as your maximum.", 1);
        }
        else
        {
            op.setUiError("maxDbRangeMax", null);
        }

        if (FFT_BUFFER_SIZES.indexOf(fftSize) >= 6)
        {
            op.setUiError("highFftSize", "Please be careful with high FFT sizes as they can slow down rendering. Check the profiler to see if performance is impacted.", 1);
        }
        else
        {
            op.setUiError("highFftSize", null);
        }
    }
    catch (e)
    {
        op.log(e);
    }
}

inFFTSize.onChange = inSmoothing.onChange
= inRangeMin.onChange = inRangeMax.onChange = () =>
    {
        if (inTrigger.isLinked()) updating = true;
        else updateAnalyser();
    };

inTrigger.onTriggered = function ()
{
    if (updating)
    {
        updateAnalyser();
        updating = false;
    }

    if (fftBufferLength != analyser.frequencyBinCount)
    {
        fftBufferLength = analyser.frequencyBinCount;
        fftDataArray = new Uint8Array(fftBufferLength);
        ampDataArray = new Uint8Array(fftBufferLength);

        frequencyArray = [];
        frequencyArray.length = fftBufferLength;

        for (let index = 0; index < fftBufferLength; index += 1)
        {
            frequencyArray[index] = Math.round(index * audioCtx.sampleRate / (analyser.fftSize * 2));
        }

        frequencyOut.set(null);
        frequencyOut.set(frequencyArray);
    }

    if (!fftDataArray) return;
    if (!ampDataArray) return;

    const fftSize = Number(inFFTSize.get());

    try
    {
        analyser.getByteFrequencyData(fftDataArray);
        analyser.getByteTimeDomainData(ampDataArray);

        let values = 0;
        let peakValues = 0;
        let ampPeakValues = 0;
        for (let i = 0; i < analyser.frequencyBinCount; i++)
        {
            values += ampDataArray[i] * ampDataArray[i];
            peakValues += fftDataArray[i];
            ampPeakValues += ampDataArray[i];
        }

        const peakAverage = peakValues / analyser.frequencyBinCount;
        const peakAmpAverage = ampPeakValues / analyser.frequencyBinCount;

        avgVolumePeak.set(peakAverage / 128);
        avgVolumeAmp.set(peakAmpAverage / 256);

        let rms = Math.sqrt(values / analyser.frequencyBinCount);
        rms = Math.max(rms, rms * inSmoothing.get());
        avgVolumeRMS.set(rms / 256);
    }
    catch (e) { op.log(e); }

    fftOut.set(null);
    fftOut.set(fftDataArray);

    ampOut.set(null);
    ampOut.set(ampDataArray);

    fftLength.set(fftDataArray.length);
    outTrigger.trigger();
};


};

Ops.WebAudio.AudioAnalyzer_v2.prototype = new CABLES.Op();
CABLES.OPS["ff9bf46c-676f-4aa1-95bf-5595a6813ed7"]={f:Ops.WebAudio.AudioAnalyzer_v2,objName:"Ops.WebAudio.AudioAnalyzer_v2"};




// **************************************************************
// 
// Ops.WebAudio.Output_v2
// 
// **************************************************************

Ops.WebAudio.Output_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
op.requirements = [CABLES.Requirements.WEBAUDIO];

let isSuspended = false;
let audioCtx = CABLES.WEBAUDIO.createAudioContext(op);
let gainNode = audioCtx.createGain();
const destinationNode = audioCtx.destination;

const
    inAudio = op.inObject("Audio In", null, "audioNode"),
    inGain = op.inFloatSlider("Volume", 1),
    inMute = op.inBool("Mute", false),
    inShowSusp = op.inBool("Show Audio Suspended Button", true),
    outVol = op.outNumber("Current Volume", 0),
    outState = op.outString("Context State", "unknown");

op.setPortGroup("Volume Settings", [inMute, inGain]);

let masterVolume = 1;
let oldAudioIn = null;
let connectedToOut = false;
let fsElement = null;

inMute.onChange = () =>
{
    mute(inMute.get());
};

inGain.onChange = setVolume;
op.onMasterVolumeChanged = setVolume;
op.patch.on("pause", setVolume);
op.patch.on("resume", setVolume);

audioCtx.addEventListener("statechange", updateStateError);
inShowSusp.onChange = updateAudioStateButton;

updateStateError();
updateAudioStateButton();

op.onDelete = () =>
{
    if (gainNode)gainNode.disconnect();
    gainNode = null;
    if (fsElement)fsElement.remove();
};

inAudio.onChange = function ()
{
    if (!inAudio.get())
    {
        if (oldAudioIn)
        {
            try
            {
                if (oldAudioIn.disconnect)
                {
                    oldAudioIn.disconnect(gainNode);
                }
            }
            catch (e)
            {
                op.logError(e);
            }
        }

        op.setUiError("multipleInputs", null);

        if (connectedToOut)
        {
            if (gainNode)gainNode.disconnect(destinationNode);
            connectedToOut = false;
        }
    }
    else
    {
        if (inAudio.links.length > 1) op.setUiError("multipleInputs", "You have connected multiple inputs. It is possible that you experience unexpected behaviour. Please use a Mixer op to connect multiple audio streams.", 1);
        else op.setUiError("multipleInputs", null);

        if (inAudio.get().connect) inAudio.get().connect(gainNode);
    }

    oldAudioIn = inAudio.get();

    if (!connectedToOut)
    {
        if (gainNode)gainNode.connect(destinationNode);
        connectedToOut = true;
    }

    setVolume();
};

function setVolume(fromMute)
{
    const masterVolume = op.patch.config.masterVolume || 0;

    let volume = inGain.get() * masterVolume;

    if (op.patch._paused || inMute.get()) volume = 0;

    let addTime = 0.05;
    if (fromMute) addTime = 0.2;

    volume = CABLES.clamp(volume, 0, 1);

    if (!gainNode)
        op.logError("gainNode undefined");

    if (gainNode) gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + addTime);

    outVol.set(volume);
}

function mute(b)
{
    if (b)
    {
        if (audioCtx.state === "suspended")
        { // make sure that when audio context is suspended node will also be muted
            // this prevents the initial short sound burst being heard when context is suspended
            // and started from user interaction
            // also note, we have to cancle the already scheduled values as we have no influence over
            // the order in which onchange handlers are executed

            if (gainNode)
            {
                gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                gainNode.gain.value = 0;
                gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            }

            outVol.set(0);

            return;
        }
    }

    setVolume(true);
}

function updateStateError()
{
    outState.set(audioCtx.state);
    op.logVerbose("audioCtx.state change", audioCtx.state);

    if (audioCtx.state == "suspended") op.setUiError("ctxSusp", "Your Browser suspended audio context, use playButton op to play audio after a user interaction");
    else op.setUiError("ctxSusp", null);

    updateAudioStateButton();
}

function updateAudioStateButton()
{
    if (!inShowSusp.get() && fsElement)
    {
        fsElement.remove();
        fsElement = null;
    }

    if (audioCtx.state == "suspended")
    {
        mute(true);
        if (inShowSusp.get())
        {
            isSuspended = true;
            if (!fsElement)
            {
                fsElement = document.createElement("div");

                const container = op.patch.cgl.canvas.parentElement;
                if (container)container.appendChild(fsElement);

                fsElement.addEventListener("pointerdown", function (e)
                {
                    if (audioCtx && audioCtx.state == "suspended")
                    {
                        audioCtx.resume();
                    }
                });
            }

            fsElement.style.padding = "10px";
            fsElement.style.position = "absolute";
            fsElement.style.right = "20px";
            fsElement.style.bottom = "20px";
            fsElement.style.width = "24px";
            fsElement.style.height = "24px";
            fsElement.style.cursor = "pointer";
            fsElement.style["border-radius"] = "40px";
            fsElement.style.background = "#444";
            fsElement.style["z-index"] = "9999";
            fsElement.style.display = "block";
            fsElement.dataset.opid = op.id;
            fsElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"feather feather-volume-2\"><polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"></polygon><path d=\"M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07\"></path></svg>";
        }
    }
    else
    {
        if (fsElement) fsElement.remove();
        fsElement = null;

        if (isSuspended)
        {
            console.log("was suspended - set vol");
            setVolume(true);
        }
    }
}


};

Ops.WebAudio.Output_v2.prototype = new CABLES.Op();
CABLES.OPS["90b95403-b0c4-4980-ab3b-b6c354771c81"]={f:Ops.WebAudio.Output_v2,objName:"Ops.WebAudio.Output_v2"};




// **************************************************************
// 
// Ops.Math.Sum
// 
// **************************************************************

Ops.Math.Sum = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    number1 = op.inValueFloat("number1", 1),
    number2 = op.inValueFloat("number2", 1),
    result = op.outValue("result");

number1.onChange =
number2.onChange = exec;
exec();

function exec()
{
    const v = number1.get() + number2.get();
    if (!isNaN(v))
        result.set(v);
}


};

Ops.Math.Sum.prototype = new CABLES.Op();
CABLES.OPS["c8fb181e-0b03-4b41-9e55-06b6267bc634"]={f:Ops.Math.Sum,objName:"Ops.Math.Sum"};




// **************************************************************
// 
// Ops.Math.Multiply
// 
// **************************************************************

Ops.Math.Multiply = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const number1 = op.inValueFloat("number1", 1);
const number2 = op.inValueFloat("number2", 2);
const result = op.outValue("result");

number1.onChange = number2.onChange = update;
update();

function update()
{
    const n1 = number1.get();
    const n2 = number2.get();

    result.set(n1 * n2);
}


};

Ops.Math.Multiply.prototype = new CABLES.Op();
CABLES.OPS["1bbdae06-fbb2-489b-9bcc-36c9d65bd441"]={f:Ops.Math.Multiply,objName:"Ops.Math.Multiply"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.ImageCompose_v2
// 
// **************************************************************

Ops.Gl.TextureEffects.ImageCompose_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={imgcomp_frag:"UNI float a;\nvoid main()\n{\n   outColor= vec4(0.0,0.0,0.0,a);\n}\n",};
const
    render = op.inTrigger("Render"),
    useVPSize = op.inBool("Use viewport size", true),
    width = op.inValueInt("Width", 640),
    height = op.inValueInt("Height", 480),
    tfilter = op.inSwitch("Filter", ["nearest", "linear", "mipmap"], "linear"),
    twrap = op.inValueSelect("Wrap", ["clamp to edge", "repeat", "mirrored repeat"], "repeat"),
    fpTexture = op.inValueBool("HDR"),
    inTransp = op.inValueBool("Transparent", false),

    trigger = op.outTrigger("Next"),
    texOut = op.outTexture("texture_out"),
    outRatio = op.outValue("Aspect Ratio");

const cgl = op.patch.cgl;
op.setPortGroup("Texture Size", [useVPSize, width, height]);
op.setPortGroup("Texture Settings", [twrap, tfilter, fpTexture, inTransp]);

texOut.set(CGL.Texture.getEmptyTexture(cgl));
let effect = null;
let tex = null;
let w = 8, h = 8;

const prevViewPort = [0, 0, 0, 0];
let reInitEffect = true;

// const bgShader = new CGL.Shader(cgl, "imgcompose bg");
// bgShader.setSource(bgShader.getDefaultVertexShader(), attachments.imgcomp_frag);

// const uniAlpha = new CGL.Uniform(bgShader, "f", "a", !inTransp.get());

let selectedFilter = CGL.Texture.FILTER_LINEAR;
let selectedWrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;

const fps = 0;
const fpsStart = 0;

twrap.onChange = onWrapChange;
tfilter.onChange = onFilterChange;

render.onTriggered = op.preRender = doRender;

onFilterChange();
onWrapChange();
updateSizePorts();

// inTransp.onChange = () =>
// {
//     uniAlpha.setValue(!inTransp.get());
// };

function initEffect()
{
    if (effect)effect.delete();
    if (tex)tex.delete();

    if (fpTexture.get() && tfilter.get() == "mipmap") op.setUiError("fpmipmap", "Don't use mipmap and HDR at the same time, many systems do not support this.");
    else op.setUiError("fpmipmap", null);

    effect = new CGL.TextureEffect(cgl, { "isFloatingPointTexture": fpTexture.get() });

    tex = new CGL.Texture(cgl,
        {
            "name": "image_compose_v2_" + op.id,
            "isFloatingPointTexture": fpTexture.get(),
            "filter": selectedFilter,
            "wrap": selectedWrap,
            "width": Math.ceil(width.get()),
            "height": Math.ceil(height.get()),
        });

    effect.setSourceTexture(tex);
    texOut.set(CGL.Texture.getEmptyTexture(cgl));

    reInitEffect = false;
}

fpTexture.onChange = function ()
{
    reInitEffect = true;
};

function updateResolution()
{
    if (!effect)initEffect();

    if (useVPSize.get())
    {
        w = cgl.getViewPort()[2];
        h = cgl.getViewPort()[3];
    }
    else
    {
        w = Math.ceil(width.get());
        h = Math.ceil(height.get());
    }

    outRatio.set(w / h);

    if ((w != tex.width || h != tex.height) && (w !== 0 && h !== 0))
    {
        // height.set(h);
        // width.set(w);
        tex.setSize(w, h);

        effect.setSourceTexture(tex);
        texOut.set(CGL.Texture.getEmptyTexture(cgl));
        texOut.set(tex);
    }

    // if (texOut.get() && selectedFilter != CGL.Texture.FILTER_NEAREST)
    // {
    //     if (!texOut.get().isPowerOfTwo()) op.setUiError("hintnpot", "texture dimensions not power of two! - texture filtering when scaling will not work on ios devices.", 0);
    //     else op.setUiError("hintnpot", null, 0);
    // }
    // else op.setUiError("hintnpot", null, 0);
}

function updateSizePorts()
{
    width.setUiAttribs({ "greyout": useVPSize.get() });
    height.setUiAttribs({ "greyout": useVPSize.get() });
}

useVPSize.onChange = function ()
{
    updateSizePorts();
};

op.preRender = function ()
{
    doRender();
    // bgShader.bind();
};

function doRender()
{
    if (!effect || reInitEffect) initEffect();

    const vp = cgl.getViewPort();
    prevViewPort[0] = vp[0];
    prevViewPort[1] = vp[1];
    prevViewPort[2] = vp[2];
    prevViewPort[3] = vp[3];

    cgl.pushBlend(false);

    updateResolution();

    const oldEffect = cgl.currentTextureEffect;
    cgl.currentTextureEffect = effect;
    cgl.currentTextureEffect.width = width.get();
    cgl.currentTextureEffect.height = height.get();
    effect.setSourceTexture(tex);

    let bgTex = CGL.Texture.getBlackTexture(cgl);
    if (inTransp.get())bgTex = CGL.Texture.getEmptyTexture(cgl);

    effect.startEffect(bgTex);

    // cgl.pushShader(bgShader);
    // cgl.currentTextureEffect.bind();
    // cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);
    // cgl.currentTextureEffect.finish();
    // cgl.popShader();

    trigger.trigger();

    texOut.set(effect.getCurrentSourceTexture());

    effect.endEffect();

    cgl.setViewPort(prevViewPort[0], prevViewPort[1], prevViewPort[2], prevViewPort[3]);

    cgl.popBlend(false);
    cgl.currentTextureEffect = oldEffect;
}

function onWrapChange()
{
    if (twrap.get() == "repeat") selectedWrap = CGL.Texture.WRAP_REPEAT;
    if (twrap.get() == "mirrored repeat") selectedWrap = CGL.Texture.WRAP_MIRRORED_REPEAT;
    if (twrap.get() == "clamp to edge") selectedWrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;

    reInitEffect = true;
    // updateResolution();
}

function onFilterChange()
{
    if (tfilter.get() == "nearest") selectedFilter = CGL.Texture.FILTER_NEAREST;
    if (tfilter.get() == "linear") selectedFilter = CGL.Texture.FILTER_LINEAR;
    if (tfilter.get() == "mipmap") selectedFilter = CGL.Texture.FILTER_MIPMAP;

    reInitEffect = true;
    // updateResolution();
}


};

Ops.Gl.TextureEffects.ImageCompose_v2.prototype = new CABLES.Op();
CABLES.OPS["a5b43d4c-a9ea-4eaf-9ed0-f257d222659d"]={f:Ops.Gl.TextureEffects.ImageCompose_v2,objName:"Ops.Gl.TextureEffects.ImageCompose_v2"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.DrawImage_v3
// 
// **************************************************************

Ops.Gl.TextureEffects.DrawImage_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={drawimage_frag:"#ifdef HAS_TEXTURES\n    IN vec2 texCoord;\n    UNI sampler2D tex;\n    UNI sampler2D image;\n#endif\n\n#ifdef TEX_TRANSFORM\n    IN mat3 transform;\n#endif\n// UNI float rotate;\n\n{{CGL.BLENDMODES}}\n\n#ifdef HAS_TEXTUREALPHA\n   UNI sampler2D imageAlpha;\n#endif\n\nUNI float amount;\n\n#ifdef ASPECT_RATIO\n    UNI float aspectTex;\n    UNI float aspectPos;\n#endif\n\nvoid main()\n{\n    vec4 blendRGBA=vec4(0.0,0.0,0.0,1.0);\n\n    #ifdef HAS_TEXTURES\n        vec2 tc=texCoord;\n\n        #ifdef TEX_FLIP_X\n            tc.x=1.0-tc.x;\n        #endif\n        #ifdef TEX_FLIP_Y\n            tc.y=1.0-tc.y;\n        #endif\n\n        #ifdef ASPECT_RATIO\n            #ifdef ASPECT_AXIS_X\n                tc.y=(1.0-aspectPos)-(((1.0-aspectPos)-tc.y)*aspectTex);\n            #endif\n            #ifdef ASPECT_AXIS_Y\n                tc.x=(1.0-aspectPos)-(((1.0-aspectPos)-tc.x)/aspectTex);\n            #endif\n        #endif\n\n        #ifdef TEX_TRANSFORM\n            vec3 coordinates=vec3(tc.x, tc.y,1.0);\n            tc=(transform * coordinates ).xy;\n        #endif\n\n        blendRGBA=texture(image,tc);\n\n        vec3 blend=blendRGBA.rgb;\n        vec4 baseRGBA=texture(tex,texCoord);\n        vec3 base=baseRGBA.rgb;\n        vec3 colNew=_blend(base,blend);\n\n        #ifdef REMOVE_ALPHA_SRC\n            blendRGBA.a=1.0;\n        #endif\n\n        #ifdef HAS_TEXTUREALPHA\n            vec4 colImgAlpha=texture(imageAlpha,tc);\n            float colImgAlphaAlpha=colImgAlpha.a;\n\n            #ifdef ALPHA_FROM_LUMINANCE\n                vec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), colImgAlpha.rgb ));\n                colImgAlphaAlpha=(gray.r+gray.g+gray.b)/3.0;\n            #endif\n\n            #ifdef ALPHA_FROM_INV_UMINANCE\n                vec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), colImgAlpha.rgb ));\n                colImgAlphaAlpha=1.0-(gray.r+gray.g+gray.b)/3.0;\n            #endif\n\n            #ifdef INVERT_ALPHA\n                colImgAlphaAlpha=clamp(colImgAlphaAlpha,0.0,1.0);\n                colImgAlphaAlpha=1.0-colImgAlphaAlpha;\n            #endif\n\n            blendRGBA.a=colImgAlphaAlpha*blendRGBA.a;\n        #endif\n    #endif\n\n    float am=amount;\n\n    #ifdef CLIP_REPEAT\n        if(tc.y>1.0 || tc.y<0.0 || tc.x>1.0 || tc.x<0.0)\n        {\n            // colNew.rgb=vec3(0.0);\n            am=0.0;\n        }\n    #endif\n\n    #ifdef ASPECT_RATIO\n        #ifdef ASPECT_CROP\n            if(tc.y>1.0 || tc.y<0.0 || tc.x>1.0 || tc.x<0.0)\n            {\n                colNew.rgb=base.rgb;\n                am=0.0;\n            }\n\n        #endif\n    #endif\n\n    // blendRGBA.rgb=mix( colNew, base ,1.0-am);\n    // blendRGBA.a=clamp((blendRGBA.a*am),0.,1.);\n\n    blendRGBA.rgb=mix(colNew,base,1.0-(am*blendRGBA.a));\n    blendRGBA.a=clamp(baseRGBA.a+(blendRGBA.a*am),0.,1.);\n\n\n    outColor= blendRGBA;\n\n}\n\n",drawimage_vert:"IN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN vec3 attrVertNormal;\n\nUNI mat4 projMatrix;\nUNI mat4 mvMatrix;\n\nOUT vec2 texCoord;\n// OUT vec3 norm;\n\n#ifdef TEX_TRANSFORM\n    UNI float posX;\n    UNI float posY;\n    UNI float scaleX;\n    UNI float scaleY;\n    UNI float rotate;\n    OUT mat3 transform;\n#endif\n\nvoid main()\n{\n   texCoord=attrTexCoord;\n//   norm=attrVertNormal;\n\n   #ifdef TEX_TRANSFORM\n        vec3 coordinates=vec3(attrTexCoord.x, attrTexCoord.y,1.0);\n        float angle = radians( rotate );\n        vec2 scale= vec2(scaleX,scaleY);\n        vec2 translate= vec2(posX,posY);\n\n        transform = mat3(   scale.x * cos( angle ), scale.x * sin( angle ), 0.0,\n            - scale.y * sin( angle ), scale.y * cos( angle ), 0.0,\n            - 0.5 * scale.x * cos( angle ) + 0.5 * scale.y * sin( angle ) - 0.5 * translate.x*2.0 + 0.5,  - 0.5 * scale.x * sin( angle ) - 0.5 * scale.y * cos( angle ) - 0.5 * translate.y*2.0 + 0.5, 1.0);\n   #endif\n\n   gl_Position = projMatrix * mvMatrix * vec4(vPosition,  1.0);\n}\n",};
const render = op.inTrigger("render");
const blendMode = CGL.TextureEffect.AddBlendSelect(op, "blendMode");
const amount = op.inValueSlider("amount", 1);

const image = op.inTexture("Image");
const removeAlphaSrc = op.inValueBool("removeAlphaSrc", false);

const imageAlpha = op.inTexture("Mask");
const alphaSrc = op.inValueSelect("Mask Src", ["alpha channel", "luminance", "luminance inv"], "luminance");
const invAlphaChannel = op.inValueBool("Invert alpha channel");

const inAspect = op.inValueBool("Aspect Ratio", false);
const inAspectAxis = op.inValueSelect("Stretch Axis", ["X", "Y"], "X");
const inAspectPos = op.inValueSlider("Position", 0.0);
const inAspectCrop = op.inValueBool("Crop", false);

const trigger = op.outTrigger("trigger");

blendMode.set("normal");
const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "drawimage");

imageAlpha.onLinkChanged = updateAlphaPorts;

op.setPortGroup("Mask", [imageAlpha, alphaSrc, invAlphaChannel]);
op.setPortGroup("Aspect Ratio", [inAspect, inAspectPos, inAspectCrop, inAspectAxis]);

removeAlphaSrc.onChange = updateRemoveAlphaSrc;

function updateAlphaPorts()
{
    if (imageAlpha.isLinked())
    {
        removeAlphaSrc.setUiAttribs({ "greyout": true });
        alphaSrc.setUiAttribs({ "greyout": false });
        invAlphaChannel.setUiAttribs({ "greyout": false });
    }
    else
    {
        removeAlphaSrc.setUiAttribs({ "greyout": false });
        alphaSrc.setUiAttribs({ "greyout": true });
        invAlphaChannel.setUiAttribs({ "greyout": true });
    }
}

op.toWorkPortsNeedToBeLinked(image);

shader.setSource(attachments.drawimage_vert, attachments.drawimage_frag);
const textureUniform = new CGL.Uniform(shader, "t", "tex", 0);
const textureImaghe = new CGL.Uniform(shader, "t", "image", 1);
const textureAlpha = new CGL.Uniform(shader, "t", "imageAlpha", 2);

const uniTexAspect = new CGL.Uniform(shader, "f", "aspectTex", 1);
const uniAspectPos = new CGL.Uniform(shader, "f", "aspectPos", inAspectPos);

invAlphaChannel.onChange = function ()
{
    if (invAlphaChannel.get()) shader.define("INVERT_ALPHA");
    else shader.removeDefine("INVERT_ALPHA");
};

inAspect.onChange = updateAspectRatio;
inAspectCrop.onChange = updateAspectRatio;
inAspectAxis.onChange = updateAspectRatio;
function updateAspectRatio()
{
    shader.removeDefine("ASPECT_AXIS_X");
    shader.removeDefine("ASPECT_AXIS_Y");
    shader.removeDefine("ASPECT_CROP");

    inAspectPos.setUiAttribs({ "greyout": !inAspect.get() });
    inAspectCrop.setUiAttribs({ "greyout": !inAspect.get() });
    inAspectAxis.setUiAttribs({ "greyout": !inAspect.get() });

    if (inAspect.get())
    {
        shader.define("ASPECT_RATIO");

        if (inAspectCrop.get()) shader.define("ASPECT_CROP");

        if (inAspectAxis.get() == "X") shader.define("ASPECT_AXIS_X");
        if (inAspectAxis.get() == "Y") shader.define("ASPECT_AXIS_Y");
    }
    else
    {
        shader.removeDefine("ASPECT_RATIO");
        if (inAspectCrop.get()) shader.define("ASPECT_CROP");

        if (inAspectAxis.get() == "X") shader.define("ASPECT_AXIS_X");
        if (inAspectAxis.get() == "Y") shader.define("ASPECT_AXIS_Y");
    }
}

function updateRemoveAlphaSrc()
{
    if (removeAlphaSrc.get()) shader.define("REMOVE_ALPHA_SRC");
    else shader.removeDefine("REMOVE_ALPHA_SRC");
}

alphaSrc.onChange = function ()
{
    shader.toggleDefine("ALPHA_FROM_LUMINANCE", alphaSrc.get() == "luminance");
    shader.toggleDefine("ALPHA_FROM_INV_UMINANCE", alphaSrc.get() == "luminance_inv");
};

alphaSrc.set("alpha channel");

{
    //
    // texture flip
    //
    const flipX = op.inValueBool("flip x");
    const flipY = op.inValueBool("flip y");

    flipX.onChange = function ()
    {
        if (flipX.get()) shader.define("TEX_FLIP_X");
        else shader.removeDefine("TEX_FLIP_X");
    };

    flipY.onChange = function ()
    {
        if (flipY.get()) shader.define("TEX_FLIP_Y");
        else shader.removeDefine("TEX_FLIP_Y");
    };
}

{
    //
    // texture transform
    //

    var doTransform = op.inValueBool("Transform");

    var scaleX = op.inValueSlider("Scale X", 1);
    var scaleY = op.inValueSlider("Scale Y", 1);

    var posX = op.inValue("Position X", 0);
    var posY = op.inValue("Position Y", 0);

    var rotate = op.inValue("Rotation", 0);

    const inClipRepeat = op.inValueBool("Clip Repeat", false);

    inClipRepeat.onChange = updateClip;
    function updateClip()
    {
        if (inClipRepeat.get()) shader.define("CLIP_REPEAT");
        else shader.removeDefine("CLIP_REPEAT");
    }

    const uniScaleX = new CGL.Uniform(shader, "f", "scaleX", scaleX);
    const uniScaleY = new CGL.Uniform(shader, "f", "scaleY", scaleY);

    const uniPosX = new CGL.Uniform(shader, "f", "posX", posX);
    const uniPosY = new CGL.Uniform(shader, "f", "posY", posY);
    const uniRotate = new CGL.Uniform(shader, "f", "rotate", rotate);

    doTransform.onChange = updateTransformPorts;
}

function updateTransformPorts()
{
    shader.toggleDefine("TEX_TRANSFORM", doTransform.get());
    if (doTransform.get())
    {
        // scaleX.setUiAttribs({hidePort:false});
        // scaleY.setUiAttribs({hidePort:false});
        // posX.setUiAttribs({hidePort:false});
        // posY.setUiAttribs({hidePort:false});
        // rotate.setUiAttribs({hidePort:false});

        scaleX.setUiAttribs({ "greyout": false });
        scaleY.setUiAttribs({ "greyout": false });
        posX.setUiAttribs({ "greyout": false });
        posY.setUiAttribs({ "greyout": false });
        rotate.setUiAttribs({ "greyout": false });
    }
    else
    {
        scaleX.setUiAttribs({ "greyout": true });
        scaleY.setUiAttribs({ "greyout": true });
        posX.setUiAttribs({ "greyout": true });
        posY.setUiAttribs({ "greyout": true });
        rotate.setUiAttribs({ "greyout": true });

        // scaleX.setUiAttribs({"hidePort":true});
        // scaleY.setUiAttribs({"hidePort":true});
        // posX.setUiAttribs({"hidePort":true});
        // posY.setUiAttribs({"hidePort":true});
        // rotate.setUiAttribs({"hidePort":true});
    }

    // op.refreshParams();
}

CGL.TextureEffect.setupBlending(op, shader, blendMode, amount);

const amountUniform = new CGL.Uniform(shader, "f", "amount", amount);

imageAlpha.onChange = function ()
{
    if (imageAlpha.get() && imageAlpha.get().tex)
    {
        shader.define("HAS_TEXTUREALPHA");
    }
    else
    {
        shader.removeDefine("HAS_TEXTUREALPHA");
    }
};

function doRender()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    const tex = image.get();
    if (tex && tex.tex && amount.get() > 0.0)
    {
        cgl.pushShader(shader);
        cgl.currentTextureEffect.bind();

        const imgTex = cgl.currentTextureEffect.getCurrentSourceTexture();
        cgl.setTexture(0, imgTex.tex);

        const asp = 1 / (cgl.currentTextureEffect.getWidth() / cgl.currentTextureEffect.getHeight()) * (tex.width / tex.height);
        // uniTexAspect.setValue(1 / (tex.height / tex.width * imgTex.width / imgTex.height));

        uniTexAspect.setValue(asp);

        cgl.setTexture(1, tex.tex);
        // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, image.get().tex );

        if (imageAlpha.get() && imageAlpha.get().tex)
        {
            cgl.setTexture(2, imageAlpha.get().tex);
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, imageAlpha.get().tex );
        }

        // cgl.pushBlend(false);

        cgl.pushBlendMode(CGL.BLEND_NONE, true);

        cgl.currentTextureEffect.finish();
        cgl.popBlendMode();

        // cgl.popBlend();

        cgl.popShader();
    }

    trigger.trigger();
}

render.onTriggered = doRender;
updateTransformPorts();
updateRemoveAlphaSrc();
updateAlphaPorts();
updateAspectRatio();


};

Ops.Gl.TextureEffects.DrawImage_v3.prototype = new CABLES.Op();
CABLES.OPS["8f6b2f15-fcb0-4597-90c0-e5173f2969fe"]={f:Ops.Gl.TextureEffects.DrawImage_v3,objName:"Ops.Gl.TextureEffects.DrawImage_v3"};




// **************************************************************
// 
// Ops.Gl.Render2Texture
// 
// **************************************************************

Ops.Gl.Render2Texture = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const cgl = op.patch.cgl;

const
    render = op.inTrigger("render"),
    useVPSize = op.inValueBool("use viewport size", true),
    width = op.inValueInt("texture width", 512),
    height = op.inValueInt("texture height", 512),
    aspect = op.inBool("Auto Aspect", false),
    tfilter = op.inSwitch("filter", ["nearest", "linear", "mipmap"], "linear"),
    twrap = op.inSwitch("Wrap", ["Clamp", "Repeat", "Mirror"], "Repeat"),
    msaa = op.inSwitch("MSAA", ["none", "2x", "4x", "8x"], "none"),
    trigger = op.outTrigger("trigger"),
    tex = op.outTexture("texture"),
    texDepth = op.outTexture("textureDepth"),
    fpTexture = op.inValueBool("HDR"),
    depth = op.inValueBool("Depth", true),
    clear = op.inValueBool("Clear", true);

let fb = null;
let reInitFb = true;
tex.set(CGL.Texture.getEmptyTexture(cgl));

op.setPortGroup("Size", [useVPSize, width, height, aspect]);

// todo why does it only work when we render a mesh before>?>?????
// only happens with matcap material with normal map....

useVPSize.onChange = updateVpSize;

function updateVpSize()
{
    width.setUiAttribs({ "greyout": useVPSize.get() });
    height.setUiAttribs({ "greyout": useVPSize.get() });
    aspect.setUiAttribs({ "greyout": useVPSize.get() });
}

function initFbLater()
{
    reInitFb = true;
}

const prevViewPort = [0, 0, 0, 0];

fpTexture.onChange =
    depth.onChange =
clear.onChange =
    tfilter.onChange =
twrap.onChange =
    msaa.onChange = initFbLater;

function doRender()
{
    const vp = cgl.getViewPort();
    prevViewPort[0] = vp[0];
    prevViewPort[1] = vp[1];
    prevViewPort[2] = vp[2];
    prevViewPort[3] = vp[3];

    if (!fb || reInitFb)
    {
        if (fb) fb.delete();

        let selectedWrap = CGL.Texture.WRAP_REPEAT;
        if (twrap.get() == "Clamp") selectedWrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;
        else if (twrap.get() == "Mirror") selectedWrap = CGL.Texture.WRAP_MIRRORED_REPEAT;

        if (fpTexture.get() && tfilter.get() == "mipmap") op.setUiError("fpmipmap", "Don't use mipmap and HDR at the same time, many systems do not support this.");
        else op.setUiError("fpmipmap", null);

        if (cgl.glVersion >= 2)
        {
            let ms = true;
            let msSamples = 4;

            if (msaa.get() == "none")
            {
                msSamples = 0;
                ms = false;
            }
            if (msaa.get() == "2x") msSamples = 2;
            if (msaa.get() == "4x") msSamples = 4;
            if (msaa.get() == "8x") msSamples = 8;

            fb = new CGL.Framebuffer2(cgl, 8, 8,
                {
                    "name": "render2texture " + op.id,
                    "isFloatingPointTexture": fpTexture.get(),
                    "multisampling": ms,
                    "wrap": selectedWrap,
                    "depth": depth.get(),
                    "multisamplingSamples": msSamples,
                    "clear": clear.get()
                });
        }
        else
        {
            fb = new CGL.Framebuffer(cgl, 8, 8, { "isFloatingPointTexture": fpTexture.get(), "clear": clear.get() });
        }

        if (tfilter.get() == "nearest") fb.setFilter(CGL.Texture.FILTER_NEAREST);
        else if (tfilter.get() == "linear") fb.setFilter(CGL.Texture.FILTER_LINEAR);
        else if (tfilter.get() == "mipmap") fb.setFilter(CGL.Texture.FILTER_MIPMAP);

        texDepth.set(fb.getTextureDepth());
        reInitFb = false;
    }

    if (useVPSize.get())
    {
        width.set(cgl.getViewPort()[2]);
        height.set(cgl.getViewPort()[3]);
    }

    if (fb.getWidth() != Math.ceil(width.get()) || fb.getHeight() != Math.ceil(height.get()))
    {
        fb.setSize(
            Math.max(1, Math.ceil(width.get())),
            Math.max(1, Math.ceil(height.get())));
    }

    fb.renderStart(cgl);

    if (aspect.get()) mat4.perspective(cgl.pMatrix, 45, width.get() / height.get(), 0.1, 1000.0);

    trigger.trigger();
    fb.renderEnd(cgl);

    // cgl.resetViewPort();
    cgl.setViewPort(prevViewPort[0], prevViewPort[1], prevViewPort[2], prevViewPort[3]);

    tex.set(CGL.Texture.getEmptyTexture(op.patch.cgl));
    tex.set(fb.getTextureColor());
}

render.onTriggered = doRender;
op.preRender = doRender;

updateVpSize();


};

Ops.Gl.Render2Texture.prototype = new CABLES.Op();
CABLES.OPS["d01fa820-396c-4cb5-9d78-6b14762852af"]={f:Ops.Gl.Render2Texture,objName:"Ops.Gl.Render2Texture"};




// **************************************************************
// 
// Ops.Gl.Meshes.FullscreenRectangle
// 
// **************************************************************

Ops.Gl.Meshes.FullscreenRectangle = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={shader_frag:"UNI sampler2D tex;\nIN vec2 texCoord;\n\nvoid main()\n{\n\n    vec2 tc=vec2(texCoord.x,(1.0-texCoord.y));\n\n   outColor= texture(tex,tc);\n}\n",shader_vert:"{{MODULES_HEAD}}\n\nIN vec3 vPosition;\nUNI mat4 projMatrix;\nUNI mat4 mvMatrix;\n\nOUT vec2 texCoord;\nIN vec2 attrTexCoord;\n\nvoid main()\n{\n   vec4 pos=vec4(vPosition,  1.0);\n\n   texCoord=attrTexCoord;\n\n   gl_Position = projMatrix * mvMatrix * pos;\n}\n",};
const
    render = op.inTrigger("render"),
    inScale = op.inSwitch("Scale", ["Stretch", "Fit"], "Stretch"),
    flipY = op.inValueBool("Flip Y"),
    flipX = op.inValueBool("Flip X"),
    inTexture = op.inTexture("Texture"),
    trigger = op.outTrigger("trigger");

const cgl = op.patch.cgl;
let mesh = null;
let geom = new CGL.Geometry("fullscreen rectangle");
let x = 0, y = 0, z = 0, w = 0, h = 0;

// inScale.onChange = rebuild;
flipX.onChange = rebuildFlip;
flipY.onChange = rebuildFlip;

const shader = new CGL.Shader(cgl, "fullscreenrectangle");
shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);

shader.setSource(attachments.shader_vert, attachments.shader_frag);
shader.fullscreenRectUniform = new CGL.Uniform(shader, "t", "tex", 0);
shader.aspectUni = new CGL.Uniform(shader, "f", "aspectTex", 0);

let useShader = false;
let updateShaderLater = true;
let fitImageAspect = false;
let oldVp = [];
render.onTriggered = doRender;

op.toWorkPortsNeedToBeLinked(render);

inTexture.onChange = function ()
{
    updateShaderLater = true;
};

function updateShader()
{
    let tex = inTexture.get();
    if (tex) useShader = true;
    else useShader = false;
}

op.preRender = function ()
{
    updateShader();
    shader.bind();
    if (mesh)mesh.render(shader);
    doRender();
};

inScale.onChange = () =>
{
    fitImageAspect = inScale.get() == "Fit";
};

function doRender()
{
    if (cgl.getViewPort()[2] != w || cgl.getViewPort()[3] != h || !mesh) rebuild();

    if (updateShaderLater) updateShader();

    cgl.pushPMatrix();
    mat4.identity(cgl.pMatrix);
    mat4.ortho(cgl.pMatrix, 0, w, h, 0, -10.0, 1000);

    cgl.pushModelMatrix();
    mat4.identity(cgl.mMatrix);

    cgl.pushViewMatrix();
    mat4.identity(cgl.vMatrix);

    if (fitImageAspect && inTexture.get())
    {
        const rat = inTexture.get().width / inTexture.get().height;

        let _h = h;
        let _w = h * rat;

        if (_w > w)
        {
            _h = w * 1 / rat;
            _w = w;
        }

        oldVp[0] = cgl.getViewPort()[0];
        oldVp[1] = cgl.getViewPort()[1];
        oldVp[2] = cgl.getViewPort()[2];
        oldVp[3] = cgl.getViewPort()[3];

        cgl.setViewPort((w - _w) / 2, (h - _h) / 2, _w, _h);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    }

    if (useShader)
    {
        if (inTexture.get())
            cgl.setTexture(0, inTexture.get().tex);

        mesh.render(shader);
    }
    else
    {
        mesh.render(cgl.getShader());
    }

    cgl.gl.clear(cgl.gl.DEPTH_BUFFER_BIT);

    cgl.popPMatrix();
    cgl.popModelMatrix();
    cgl.popViewMatrix();

    if (fitImageAspect && inTexture.get())
        cgl.setViewPort(oldVp[0], oldVp[1], oldVp[2], oldVp[3]);

    trigger.trigger();
}

function rebuildFlip()
{
    mesh = null;
}

function rebuild()
{
    const currentViewPort = cgl.getViewPort();

    if (currentViewPort[2] == w && currentViewPort[3] == h && mesh) return;

    let xx = 0, xy = 0;

    w = currentViewPort[2];
    h = currentViewPort[3];

    geom.vertices = new Float32Array([
        xx + w, xy + h, 0.0,
        xx, xy + h, 0.0,
        xx + w, xy, 0.0,
        xx, xy, 0.0
    ]);

    let tc = null;

    if (flipY.get())
        tc = new Float32Array([
            1.0, 0.0,
            0.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);
    else
        tc = new Float32Array([
            1.0, 1.0,
            0.0, 1.0,
            1.0, 0.0,
            0.0, 0.0
        ]);

    if (flipX.get())
    {
        tc[0] = 0.0;
        tc[2] = 1.0;
        tc[4] = 0.0;
        tc[6] = 1.0;
    }

    geom.setTexCoords(tc);

    geom.verticesIndices = new Float32Array([
        2, 1, 0,
        3, 1, 2
    ]);

    geom.vertexNormals = new Float32Array([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
    ]);
    geom.tangents = new Float32Array([
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0]);
    geom.biTangents == new Float32Array([
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0]);

    if (!mesh) mesh = new CGL.Mesh(cgl, geom);
    else mesh.setGeom(geom);
}


};

Ops.Gl.Meshes.FullscreenRectangle.prototype = new CABLES.Op();
CABLES.OPS["255bd15b-cc91-4a12-9b4e-53c710cbb282"]={f:Ops.Gl.Meshes.FullscreenRectangle,objName:"Ops.Gl.Meshes.FullscreenRectangle"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.ChromaticAberration
// 
// **************************************************************

Ops.Gl.TextureEffects.ChromaticAberration = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={chromatic_frag:"\nIN vec2 texCoord;\nUNI sampler2D tex;\nUNI float pixel;\nUNI float onePixel;\nUNI float amount;\nUNI float lensDistort;\n\n#ifdef MASK\nUNI sampler2D texMask;\n#endif\n\n{{CGL.BLENDMODES}}\n\nvoid main()\n{\n   vec4 base=texture(tex,texCoord);\n   vec4 col=texture(tex,texCoord);\n\n   vec2 tc=texCoord;;\n   float pix = pixel;\n   if(lensDistort>0.0)\n   {\n       float dist = distance(texCoord, vec2(0.5,0.5));\n       tc-=0.5;\n       tc *=smoothstep(-0.9,1.0*lensDistort,1.0-dist);\n       tc+=0.5;\n   }\n\n    #ifdef MASK\n        vec4 m=texture(texMask,texCoord);\n        pix*=m.r*m.a;\n    #endif\n\n    #ifdef SMOOTH\n    #ifdef WEBGL2\n        float numSamples=round(pix/onePixel/4.0+1.0);\n        col.r=0.0;\n        col.b=0.0;\n\n        for(float off=0.0;off<numSamples;off++)\n        {\n            float diff=(pix/numSamples)*off;\n            col.r+=texture(tex,vec2(tc.x+diff,tc.y)).r/numSamples;\n            col.b+=texture(tex,vec2(tc.x-diff,tc.y)).b/numSamples;\n        }\n    #endif\n    #endif\n\n    #ifndef SMOOTH\n        col.r=texture(tex,vec2(tc.x+pix,tc.y)).r;\n        col.b=texture(tex,vec2(tc.x-pix,tc.y)).b;\n    #endif\n\n//   outColor = col;\n   outColor= cgl_blend(base,col,amount);\n\n}\n",};
const
    render=op.inTrigger('render'),
    blendMode=CGL.TextureEffect.AddBlendSelect(op,"Blend Mode","normal"),
    amount=op.inValueSlider("Amount",1),
    pixel=op.inValue("Pixel",5),
    lensDistort=op.inValueSlider("Lens Distort",0),
    doSmooth=op.inValueBool("Smooth",false),
    textureMask=op.inTexture("Mask"),
    trigger=op.outTrigger('trigger');

const cgl=op.patch.cgl;
const shader=new CGL.Shader(cgl,"chromatic");

CGL.TextureEffect.setupBlending(op,shader,blendMode,amount);

shader.setSource(shader.getDefaultVertexShader(),attachments.chromatic_frag);
const textureUniform=new CGL.Uniform(shader,'t','tex',0),
    uniPixel=new CGL.Uniform(shader,'f','pixel',0),
    uniOnePixel=new CGL.Uniform(shader,'f','onePixel',0),
    unitexMask=new CGL.Uniform(shader,'t','texMask',1),
    uniAmount=new CGL.Uniform(shader,'f','amount',amount),
    unilensDistort=new CGL.Uniform(shader,'f','lensDistort',lensDistort);

doSmooth.onChange=function()
{
    if(doSmooth.get())shader.define("SMOOTH");
    else shader.removeDefine("SMOOTH");
};

textureMask.onChange=function()
{
    if(textureMask.get())shader.define("MASK");
    else shader.removeDefine("MASK");
};

render.onTriggered=function()
{
    if(!CGL.TextureEffect.checkOpInEffect(op)) return;

    var texture=cgl.currentTextureEffect.getCurrentSourceTexture();

    uniPixel.setValue(pixel.get()*(1/texture.width));
    uniOnePixel.setValue(1/texture.width);

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(0, texture.tex );

    if(textureMask.get()) cgl.setTexture(1, textureMask.get().tex );

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.TextureEffects.ChromaticAberration.prototype = new CABLES.Op();
CABLES.OPS["38ac43a1-1757-48f4-9450-29f07ac0d376"]={f:Ops.Gl.TextureEffects.ChromaticAberration,objName:"Ops.Gl.TextureEffects.ChromaticAberration"};




// **************************************************************
// 
// Ops.Gl.Phong.PhongMaterial_v6
// 
// **************************************************************

Ops.Gl.Phong.PhongMaterial_v6 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={phong_frag:"IN vec3 viewDirection;\nIN vec3 normInterpolated;\nIN vec2 texCoord;\n\n#ifdef ENABLE_FRESNEL\n    IN vec4 cameraSpace_pos;\n#endif\n\n// IN mat3 normalMatrix; // when instancing...\n\n#ifdef HAS_TEXTURE_NORMAL\n    IN mat3 TBN_Matrix; // tangent bitangent normal space transform matrix\n#endif\n\nIN vec3 fragPos;\nIN vec3 v_viewDirection;\n\nUNI vec4 inDiffuseColor;\nUNI vec4 inMaterialProperties;\n\n#ifdef ADD_EMISSIVE_COLOR\n    UNI vec4 inEmissiveColor; // .w = intensity\n#endif\n\n#ifdef ENABLE_FRESNEL\n    UNI mat4 viewMatrix;\n    UNI vec4 inFresnel;\n    UNI vec2 inFresnelWidthExponent;\n#endif\n\n#ifdef ENVMAP_MATCAP\n    IN vec3 viewSpaceNormal;\n    IN vec3 viewSpacePosition;\n#endif\n\nstruct Light {\n    vec3 color;\n    vec3 position;\n    vec3 specular;\n\n\n    // * SPOT LIGHT * //\n    #ifdef HAS_SPOT\n        vec3 conePointAt;\n        #define COSCONEANGLE x\n        #define COSCONEANGLEINNER y\n        #define SPOTEXPONENT z\n        vec3 spotProperties;\n    #endif\n\n    #define INTENSITY x\n    #define ATTENUATION y\n    #define FALLOFF z\n    #define RADIUS w\n    vec4 lightProperties;\n\n    int castLight;\n};\n\n/* CONSTANTS */\n#define NONE -1\n#define ALBEDO x\n#define ROUGHNESS y\n#define SHININESS z\n#define SPECULAR_AMT w\n#define NORMAL x\n#define AO y\n#define SPECULAR z\n#define EMISSIVE w\nconst float PI = 3.1415926535897932384626433832795;\nconst float TWO_PI = (2. * PI);\nconst float EIGHT_PI = (8. * PI);\n\n#define RECIPROCAL_PI 1./PI\n#define RECIPROCAL_PI2 RECIPROCAL_PI/2.\n\n// TEXTURES\n// #ifdef HAS_TEXTURES\n    UNI vec4 inTextureIntensities;\n\n    #ifdef HAS_TEXTURE_ENV\n        #ifdef TEX_FORMAT_CUBEMAP\n            UNI samplerCube texEnv;\n            #ifndef WEBGL1\n                #define SAMPLETEX textureLod\n            #endif\n            #ifdef WEBGL1\n                #define SAMPLETEX textureCubeLodEXT\n            #endif\n        #endif\n\n        #ifdef TEX_FORMAT_EQUIRECT\n            UNI sampler2D texEnv;\n            #ifdef WEBGL1\n                // #extension GL_EXT_shader_texture_lod : enable\n                #ifdef GL_EXT_shader_texture_lod\n                    #define textureLod texture2DLodEXT\n                #endif\n                // #define textureLod texture2D\n            #endif\n\n            #define SAMPLETEX sampleEquirect\n\n            const vec2 invAtan = vec2(0.1591, 0.3183);\n            vec4 sampleEquirect(sampler2D tex,vec3 direction,float lod)\n            {\n                #ifndef WEBGL1\n                    vec3 newDirection = normalize(direction);\n            \t\tvec2 sampleUV;\n            \t\tsampleUV.x = -1. * (atan( direction.z, direction.x ) * RECIPROCAL_PI2 + 0.75);\n            \t\tsampleUV.y = asin( clamp(direction.y, -1., 1.) ) * RECIPROCAL_PI + 0.5;\n                #endif\n\n                #ifdef WEBGL1\n                    vec3 newDirection = normalize(direction);\n                \t\tvec2 sampleUV = vec2(atan(newDirection.z, newDirection.x), asin(newDirection.y+1e-6));\n                        sampleUV *= vec2(0.1591, 0.3183);\n                        sampleUV += 0.5;\n                #endif\n                return textureLod(tex, sampleUV, lod);\n            }\n        #endif\n        #ifdef ENVMAP_MATCAP\n            UNI sampler2D texEnv;\n            #ifdef WEBGL1\n                // #extension GL_EXT_shader_texture_lod : enable\n                #ifdef GL_EXT_shader_texture_lod\n                    #define textureLod texture2DLodEXT\n                #endif\n                // #define textureLod texture2D\n            #endif\n\n\n            // * taken & modified from https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshmatcap_frag.glsl.js\n            vec2 getMatCapUV(vec3 viewSpacePosition, vec3 viewSpaceNormal) {\n                vec3 viewDir = normalize(-viewSpacePosition);\n            \tvec3 x = normalize(vec3(viewDir.z, 0.0, - viewDir.x));\n            \tvec3 y = normalize(cross(viewDir, x));\n            \tvec2 uv = vec2(dot(x, viewSpaceNormal), dot(y, viewSpaceNormal)) * 0.495 + 0.5; // 0.495 to remove artifacts caused by undersized matcap disks\n            \treturn uv;\n            }\n        #endif\n\n        UNI float inEnvMapIntensity;\n        UNI float inEnvMapWidth;\n    #endif\n\n    #ifdef HAS_TEXTURE_LUMINANCE_MASK\n        UNI sampler2D texLuminance;\n        UNI float inLuminanceMaskIntensity;\n    #endif\n\n    #ifdef HAS_TEXTURE_DIFFUSE\n        UNI sampler2D texDiffuse;\n    #endif\n\n    #ifdef HAS_TEXTURE_SPECULAR\n        UNI sampler2D texSpecular;\n    #endif\n\n    #ifdef HAS_TEXTURE_NORMAL\n        UNI sampler2D texNormal;\n    #endif\n\n    #ifdef HAS_TEXTURE_AO\n        UNI sampler2D texAO;\n    #endif\n\n    #ifdef HAS_TEXTURE_EMISSIVE\n        UNI sampler2D texEmissive;\n    #endif\n\n    #ifdef HAS_TEXTURE_EMISSIVE_MASK\n        UNI sampler2D texMaskEmissive;\n        UNI float inEmissiveMaskIntensity;\n    #endif\n    #ifdef HAS_TEXTURE_ALPHA\n        UNI sampler2D texAlpha;\n    #endif\n// #endif\n\n{{MODULES_HEAD}}\n\nfloat when_gt(float x, float y) { return max(sign(x - y), 0.0); } // comparator function\nfloat when_lt(float x, float y) { return max(sign(y - x), 0.0); }\nfloat when_eq(float x, float y) { return 1. - abs(sign(x - y)); } // comparator function\nfloat when_neq(float x, float y) { return abs(sign(x - y)); } // comparator function\nfloat when_ge(float x, float y) { return 1.0 - when_lt(x, y); }\nfloat when_le(float x, float y) { return 1.0 - when_gt(x, y); }\n\n#ifdef FALLOFF_MODE_A\n    float CalculateFalloff(float distance, vec3 lightDirection, float falloff, float radius) {\n        // * original falloff\n        float denom = distance / radius + 1.0;\n        float attenuation = 1.0 / (denom*denom);\n        float t = (attenuation - falloff) / (1.0 - falloff);\n        return max(t, 0.0);\n    }\n#endif\n\n#ifdef FALLOFF_MODE_B\n    float CalculateFalloff(float distance, vec3 lightDirection, float falloff, float radius) {\n        float distanceSquared = dot(lightDirection, lightDirection);\n        float factor = distanceSquared * falloff;\n        float smoothFactor = clamp(1. - factor * factor, 0., 1.);\n        float attenuation = smoothFactor * smoothFactor;\n\n        return attenuation * 1. / max(distanceSquared, 0.00001);\n    }\n#endif\n\n#ifdef FALLOFF_MODE_C\n    float CalculateFalloff(float distance, vec3 lightDirection, float falloff, float radius) {\n        // https://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf\n        float falloffNumerator = 1. - pow(distance/radius, 4.);\n        falloffNumerator = clamp(falloffNumerator, 0., 1.);\n        falloffNumerator *= falloffNumerator;\n\n        float denominator = distance*distance + falloff;\n\n        return falloffNumerator/denominator;\n    }\n#endif\n\n#ifdef FALLOFF_MODE_D\n    float CalculateFalloff(float distance, vec3 lightDirection, float falloff, float radius) {\n        // inverse square falloff, \"physically correct\"\n        return 1.0 / max(distance * distance, 0.0001);\n    }\n#endif\n\n#ifdef ENABLE_FRESNEL\n    float CalculateFresnel(vec3 direction, vec3 normal)\n    {\n        vec3 nDirection = normalize( direction );\n        vec3 nNormal = normalize( mat3(viewMatrix) * normal );\n        vec3 halfDirection = normalize( nNormal + nDirection );\n\n        float cosine = dot( halfDirection, nDirection );\n        float product = max( cosine, 0.0 );\n        float factor = pow(product, inFresnelWidthExponent.y);\n\n        return 5. * factor;\n    }\n#endif\n\n#ifdef CONSERVE_ENERGY\n    // http://www.rorydriscoll.com/2009/01/25/energy-conservation-in-games/\n    // http://www.farbrausch.de/~fg/articles/phong.pdf\n    float EnergyConservation(float shininess) {\n        #ifdef SPECULAR_PHONG\n            return (shininess + 2.)/TWO_PI;\n        #endif\n        #ifdef SPECULAR_BLINN\n            return (shininess + 8.)/EIGHT_PI;\n        #endif\n\n        #ifdef SPECULAR_SCHLICK\n            return (shininess + 8.)/EIGHT_PI;\n        #endif\n\n        #ifdef SPECULAR_GAUSS\n            return (shininess + 8.)/EIGHT_PI;\n        #endif\n    }\n#endif\n\n#ifdef ENABLE_OREN_NAYAR_DIFFUSE\n    float CalculateOrenNayar(vec3 lightDirection, vec3 viewDirection, vec3 normal) {\n        float LdotV = dot(lightDirection, viewDirection);\n        float NdotL = dot(lightDirection, normal);\n        float NdotV = dot(normal, viewDirection);\n\n        float albedo = inMaterialProperties.ALBEDO;\n        albedo *= 1.8;\n        float s = LdotV - NdotL * NdotV;\n        float t = mix(1., max(NdotL, NdotV), step(0., s));\n\n        float roughness = inMaterialProperties.ROUGHNESS;\n        float sigma2 = roughness * roughness;\n        float A = 1. + sigma2 * (albedo / (sigma2 + 0.13) + 0.5 / (sigma2 + 0.33));\n        float B = 0.45 * sigma2 / (sigma2 + 0.09);\n\n        float factor = albedo * max(0., NdotL) * (A + B * s / t) / PI;\n\n        return factor;\n\n    }\n#endif\n\nvec3 CalculateDiffuseColor(\n    vec3 lightDirection,\n    vec3 viewDirection,\n    vec3 normal,\n    vec3 lightColor,\n    vec3 materialColor,\n    inout float lambert\n) {\n    #ifndef ENABLE_OREN_NAYAR_DIFFUSE\n        lambert = clamp(dot(lightDirection, normal), 0., 1.);\n    #endif\n\n    #ifdef ENABLE_OREN_NAYAR_DIFFUSE\n        lambert = CalculateOrenNayar(lightDirection, viewDirection, normal);\n    #endif\n\n    vec3 diffuseColor = lambert * lightColor * materialColor;\n    return diffuseColor;\n}\n\nvec3 CalculateSpecularColor(\n    vec3 specularColor,\n    float specularCoefficient,\n    float shininess,\n    vec3 lightDirection,\n    vec3 viewDirection,\n    vec3 normal,\n    float lambertian\n) {\n    vec3 resultColor = vec3(0.);\n\n    #ifdef SPECULAR_PHONG\n        vec3 reflectDirection = reflect(-lightDirection, normal);\n        float specularAngle = max(dot(reflectDirection, viewDirection), 0.);\n        float specularFactor = pow(specularAngle, max(0., shininess));\n    resultColor = lambertian * specularFactor * specularCoefficient * specularColor;\n    #endif\n\n    #ifdef SPECULAR_BLINN\n        vec3 halfDirection = normalize(lightDirection + viewDirection);\n        float specularAngle = max(dot(halfDirection, normal), 0.);\n        float specularFactor = pow(specularAngle, max(0., shininess));\n        resultColor = lambertian * specularFactor * specularCoefficient * specularColor;\n    #endif\n\n    #ifdef SPECULAR_SCHLICK\n        vec3 halfDirection = normalize(lightDirection + viewDirection);\n        float specularAngle = dot(halfDirection, normal);\n        float schlickShininess = max(0., shininess);\n        float specularFactor = specularAngle / (schlickShininess - schlickShininess*specularAngle + specularAngle);\n        resultColor = lambertian * specularFactor * specularCoefficient * specularColor;\n    #endif\n\n    #ifdef SPECULAR_GAUSS\n        vec3 halfDirection = normalize(lightDirection + viewDirection);\n        float specularAngle = acos(max(dot(halfDirection, normal), 0.));\n        float exponent = specularAngle * shininess * 0.17;\n        exponent = -(exponent*exponent);\n        float specularFactor = exp(exponent);\n\n        resultColor = lambertian * specularFactor * specularCoefficient * specularColor;\n    #endif\n\n    #ifdef CONSERVE_ENERGY\n        float conserveEnergyFactor = EnergyConservation(shininess);\n        resultColor = conserveEnergyFactor * resultColor;\n    #endif\n\n    return resultColor;\n}\n\n#ifdef HAS_SPOT\n    float CalculateSpotLightEffect(vec3 lightPosition, vec3 conePointAt, float cosConeAngle, float cosConeAngleInner, float spotExponent, vec3 lightDirection) {\n        vec3 spotLightDirection = normalize(lightPosition-conePointAt);\n        float spotAngle = dot(-lightDirection, spotLightDirection);\n        float epsilon = cosConeAngle - cosConeAngleInner;\n\n        float spotIntensity = clamp((spotAngle - cosConeAngle)/epsilon, 0.0, 1.0);\n        spotIntensity = pow(spotIntensity, max(0.01, spotExponent));\n\n        return max(0., spotIntensity);\n    }\n#endif\n\n\n\n{{PHONG_FRAGMENT_HEAD}}\n\n\nvoid main()\n{\n    {{MODULE_BEGIN_FRAG}}\n\n    vec4 col=vec4(0., 0., 0., inDiffuseColor.a);\n    vec3 calculatedColor = vec3(0.);\n    vec3 normal = normalize(normInterpolated);\n    vec3 baseColor = inDiffuseColor.rgb;\n\n    {{MODULE_BASE_COLOR}}\n\n\n    vec3 viewDirection = normalize(v_viewDirection);\n\n    #ifdef DOUBLE_SIDED\n        if(!gl_FrontFacing) normal = normal * -1.0;\n    #endif\n\n    #ifdef HAS_TEXTURES\n        #ifdef HAS_TEXTURE_DIFFUSE\n            baseColor = texture(texDiffuse, texCoord).rgb;\n\n            #ifdef COLORIZE_TEXTURE\n                baseColor *= inDiffuseColor.rgb;\n            #endif\n        #endif\n\n        #ifdef HAS_TEXTURE_NORMAL\n            normal = texture(texNormal, texCoord).rgb;\n            normal = normalize(normal * 2. - 1.);\n            float normalIntensity = inTextureIntensities.NORMAL;\n            normal = normalize(mix(vec3(0., 0., 1.), normal, 2. * normalIntensity));\n            normal = normalize(TBN_Matrix * normal);\n        #endif\n    #endif\n\n    {{PHONG_FRAGMENT_BODY}}\n\n\n\n\n\n\n    #ifdef ENABLE_FRESNEL\n        calculatedColor += inFresnel.rgb * (CalculateFresnel(vec3(cameraSpace_pos), normal) * inFresnel.w * inFresnelWidthExponent.x);\n    #endif\n\n     #ifdef HAS_TEXTURE_ALPHA\n        #ifdef ALPHA_MASK_ALPHA\n            col.a*=texture(texAlpha,texCoord).a;\n        #endif\n        #ifdef ALPHA_MASK_LUMI\n            col.a*= dot(vec3(0.2126,0.7152,0.0722), texture(texAlpha,texCoord).rgb);\n        #endif\n        #ifdef ALPHA_MASK_R\n            col.a*=texture(texAlpha,texCoord).r;\n        #endif\n        #ifdef ALPHA_MASK_G\n            col.a*=texture(texAlpha,texCoord).g;\n        #endif\n        #ifdef ALPHA_MASK_B\n            col.a*=texture(texAlpha,texCoord).b;\n        #endif\n    #endif\n\n    #ifdef DISCARDTRANS\n        if(col.a<0.2) discard;\n    #endif\n\n\n    #ifdef HAS_TEXTURE_ENV\n        vec3 luminanceColor = vec3(0.);\n\n        #ifndef ENVMAP_MATCAP\n            float environmentMapWidth = inEnvMapWidth;\n            float glossyExponent = inMaterialProperties.SHININESS;\n            float glossyCoefficient = inMaterialProperties.SPECULAR_AMT;\n\n            vec3 envMapNormal =  normal;\n            vec3 reflectDirection = reflect(normalize(-viewDirection), normal);\n\n            float lambertianCoefficient = dot(viewDirection, reflectDirection); //0.44; // TODO: need prefiltered map for this\n            // lambertianCoefficient = 1.;\n            float specularAngle = max(dot(reflectDirection, viewDirection), 0.);\n            float specularFactor = pow(specularAngle, max(0., inMaterialProperties.SHININESS));\n\n            glossyExponent = specularFactor;\n\n            float maxMIPLevel = 10.;\n            float MIPlevel = log2(environmentMapWidth / 1024. * sqrt(3.)) - 0.5 * log2(glossyExponent + 1.);\n\n            luminanceColor = inEnvMapIntensity * (\n                inDiffuseColor.rgb *\n                SAMPLETEX(texEnv, envMapNormal, maxMIPLevel).rgb\n                +\n                glossyCoefficient * SAMPLETEX(texEnv, reflectDirection, MIPlevel).rgb\n            );\n        #endif\n        #ifdef ENVMAP_MATCAP\n            luminanceColor = inEnvMapIntensity * (\n                texture(texEnv, getMatCapUV(viewSpacePosition, viewSpaceNormal)).rgb\n                //inDiffuseColor.rgb\n                //* textureLod(texEnv, getMatCapUV(envMapNormal), maxMIPLevel).rgb\n                //+\n                //glossyCoefficient * textureLod(texEnv, getMatCapUV(reflectDirection), MIPlevel).rgb\n            );\n        #endif\n\n\n\n        #ifdef HAS_TEXTURE_LUMINANCE_MASK\n            luminanceColor *= texture(texLuminance, texCoord).r * inLuminanceMaskIntensity;\n        #endif\n\n        #ifdef HAS_TEXTURE_AO\n            // luminanceColor *= mix(vec3(1.), texture(texAO, texCoord).rgb, inTextureIntensities.AO);\n            luminanceColor *= texture(texAO, texCoord).g*inTextureIntensities.AO;\n        #endif\n\n        calculatedColor.rgb += luminanceColor;\n\n\n    #endif\n\n    #ifdef ADD_EMISSIVE_COLOR\n        vec3 emissiveRadiance = mix(calculatedColor, inEmissiveColor.rgb, inEmissiveColor.w); // .w = intensity of color;\n\n        #ifdef HAS_TEXTURE_EMISSIVE\n            float emissiveIntensity = inTextureIntensities.EMISSIVE;\n            emissiveRadiance = mix(calculatedColor, texture(texEmissive, texCoord).rgb, emissiveIntensity);\n        #endif\n\n        #ifdef HAS_TEXTURE_EMISSIVE_MASK\n           float emissiveMixValue = mix(1., texture(texMaskEmissive, texCoord).r, inEmissiveMaskIntensity);\n           calculatedColor = mix(calculatedColor, emissiveRadiance, emissiveMixValue);\n        #endif\n\n        #ifndef HAS_TEXTURE_EMISSIVE_MASK\n            calculatedColor = emissiveRadiance;\n        #endif\n    #endif\n\n    col.rgb = clamp(calculatedColor, 0., 1.);\n\n\n    {{MODULE_COLOR}}\n\n    outColor = col;\n}\n",phong_vert:"\n{{MODULES_HEAD}}\n\n#define NONE -1\n#define AMBIENT 0\n#define POINT 1\n#define DIRECTIONAL 2\n#define SPOT 3\n\n#define TEX_REPEAT_X x;\n#define TEX_REPEAT_Y y;\n#define TEX_OFFSET_X z;\n#define TEX_OFFSET_Y w;\n\nIN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN vec3 attrVertNormal;\nIN float attrVertIndex;\nIN vec3 attrTangent;\nIN vec3 attrBiTangent;\n\nOUT vec2 texCoord;\nOUT vec3 normInterpolated;\nOUT vec3 fragPos;\n\n#ifdef HAS_TEXTURE_NORMAL\n    OUT mat3 TBN_Matrix; // tangent bitangent normal space transform matrix\n#endif\n\n#ifdef ENABLE_FRESNEL\n    OUT vec4 cameraSpace_pos;\n#endif\n\nOUT vec3 v_viewDirection;\nOUT mat3 normalMatrix;\nOUT mat4 mvMatrix;\n\n#ifdef HAS_TEXTURES\n    UNI vec4 inTextureRepeatOffset;\n#endif\n\nUNI vec3 camPos;\nUNI mat4 projMatrix;\nUNI mat4 viewMatrix;\nUNI mat4 modelMatrix;\n\n#ifdef ENVMAP_MATCAP\n    OUT vec3 viewSpaceNormal;\n    OUT vec3 viewSpacePosition;\n#endif\n\n\nmat3 transposeMat3(mat3 m)\n{\n    return mat3(m[0][0], m[1][0], m[2][0],\n        m[0][1], m[1][1], m[2][1],\n        m[0][2], m[1][2], m[2][2]);\n}\n\nmat3 inverseMat3(mat3 m)\n{\n    float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];\n    float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];\n    float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];\n\n    float b01 = a22 * a11 - a12 * a21;\n    float b11 = -a22 * a10 + a12 * a20;\n    float b21 = a21 * a10 - a11 * a20;\n\n    float det = a00 * b01 + a01 * b11 + a02 * b21;\n\n    return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11),\n        b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10),\n        b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;\n}\n\nvoid main()\n{\n    mat4 mMatrix=modelMatrix;\n    vec4 pos=vec4(vPosition,  1.0);\n\n    texCoord=attrTexCoord;\n    texCoord.y = 1. - texCoord.y;\n    vec3 norm=attrVertNormal;\n\n    vec3 tangent = attrTangent;\n    vec3 bitangent = attrBiTangent;\n\n    {{MODULE_VERTEX_POSITION}}\n\n    normalMatrix = transposeMat3(inverseMat3(mat3(mMatrix)));\n    mvMatrix = (viewMatrix * mMatrix);\n\n\n\n    #ifdef ENABLE_FRESNEL\n        cameraSpace_pos = mvMatrix * pos;\n    #endif\n\n    #ifdef HAS_TEXTURES\n        float repeatX = inTextureRepeatOffset.TEX_REPEAT_X;\n        float offsetX = inTextureRepeatOffset.TEX_OFFSET_X;\n        float repeatY = inTextureRepeatOffset.TEX_REPEAT_Y;\n        float offsetY = inTextureRepeatOffset.TEX_OFFSET_Y;\n\n        texCoord.x *= repeatX;\n        texCoord.x += offsetX;\n        texCoord.y *= repeatY;\n        texCoord.y += offsetY;\n    #endif\n\n   normInterpolated = vec3(normalMatrix*norm);\n\n    #ifdef HAS_TEXTURE_NORMAL\n        vec3 normCameraSpace = normalize((vec4(normInterpolated, 0.0)).xyz);\n        vec3 tangCameraSpace = normalize((mMatrix * vec4(tangent, 0.0)).xyz);\n        vec3 bitangCameraSpace = normalize((mMatrix * vec4(bitangent, 0.0)).xyz);\n\n        // re orthogonalization for smoother normals\n        tangCameraSpace = normalize(tangCameraSpace - dot(tangCameraSpace, normCameraSpace) * normCameraSpace);\n        bitangCameraSpace = cross(normCameraSpace, tangCameraSpace);\n\n        TBN_Matrix = mat3(tangCameraSpace, bitangCameraSpace, normCameraSpace);\n    #endif\n\n    fragPos = vec3((mMatrix) * pos);\n    v_viewDirection = normalize(camPos - fragPos);\n    // modelPos=mMatrix*pos;\n\n    #ifdef ENVMAP_MATCAP\n        mat3 viewSpaceNormalMatrix = normalMatrix = transposeMat3(inverseMat3(mat3(mvMatrix)));\n        viewSpaceNormal = normalize(viewSpaceNormalMatrix * norm);\n        viewSpacePosition = vec3(mvMatrix * pos);\n    #endif\n    gl_Position = projMatrix * mvMatrix * pos;\n}\n",snippet_body_ambient_frag:"    // * AMBIENT LIGHT {{LIGHT_INDEX}} *\n    vec3 diffuseColor{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.lightProperties.INTENSITY*phongLight{{LIGHT_INDEX}}.color;\n    calculatedColor += diffuseColor{{LIGHT_INDEX}};\n",snippet_body_directional_frag:"    // * DIRECTIONAL LIGHT {{LIGHT_INDEX}} *\n\n    if (phongLight{{LIGHT_INDEX}}.castLight == 1) {\n        vec3 phongLightDirection{{LIGHT_INDEX}} = normalize(phongLight{{LIGHT_INDEX}}.position);\n\n        float phongLambert{{LIGHT_INDEX}} = 1.; // inout variable\n\n        vec3 lightColor{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.color;\n        vec3 lightSpecular{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.specular;\n\n        #ifdef HAS_TEXTURES\n            #ifdef HAS_TEXTURE_AO\n                // lightColor{{LIGHT_INDEX}} *= mix(vec3(1.), texture(texAO, texCoord).rgb, inTextureIntensities.AO);\n                lightColor{{LIGHT_INDEX}} *= texture(texAO, texCoord).g, inTextureIntensities.AO;\n\n            #endif\n\n            #ifdef HAS_TEXTURE_SPECULAR\n                lightSpecular{{LIGHT_INDEX}} *= mix(1., texture(texSpecular, texCoord).r, inTextureIntensities.SPECULAR);\n            #endif\n        #endif\n\n        vec3 diffuseColor{{LIGHT_INDEX}} = CalculateDiffuseColor(phongLightDirection{{LIGHT_INDEX}}, viewDirection, normal, lightColor{{LIGHT_INDEX}}, baseColor, phongLambert{{LIGHT_INDEX}});\n        vec3 specularColor{{LIGHT_INDEX}} = CalculateSpecularColor(\n            lightSpecular{{LIGHT_INDEX}},\n            inMaterialProperties.SPECULAR_AMT,\n            inMaterialProperties.SHININESS,\n            phongLightDirection{{LIGHT_INDEX}},\n            viewDirection,\n            normal,\n            phongLambert{{LIGHT_INDEX}}\n        );\n\n        vec3 combinedColor{{LIGHT_INDEX}} = (diffuseColor{{LIGHT_INDEX}} + specularColor{{LIGHT_INDEX}});\n\n        vec3 lightModelDiff{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.position - fragPos.xyz;\n\n        combinedColor{{LIGHT_INDEX}} *= phongLight{{LIGHT_INDEX}}.lightProperties.INTENSITY;\n        calculatedColor += combinedColor{{LIGHT_INDEX}};\n    }",snippet_body_point_frag:"// * POINT LIGHT {{LIGHT_INDEX}} *\n    if (phongLight{{LIGHT_INDEX}}.castLight == 1) {\n        vec3 phongLightDirection{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.position - fragPos.xyz;\n        // * get length before normalization for falloff calculation\n        phongLightDirection{{LIGHT_INDEX}} = normalize(phongLightDirection{{LIGHT_INDEX}});\n        float phongLightDistance{{LIGHT_INDEX}} = length(phongLightDirection{{LIGHT_INDEX}});\n\n        float phongLambert{{LIGHT_INDEX}} = 1.; // inout variable\n\n        vec3 lightColor{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.color;\n        vec3 lightSpecular{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.specular;\n\n        #ifdef HAS_TEXTURES\n            #ifdef HAS_TEXTURE_AO\n                // lightColor{{LIGHT_INDEX}} *= mix(vec3(1.), texture(texAO, texCoord).rgb, inTextureIntensities.AO);\n                lightColor{{LIGHT_INDEX}} *= texture(texAO, texCoord).g, inTextureIntensities.AO;\n\n            #endif\n\n            #ifdef HAS_TEXTURE_SPECULAR\n                lightSpecular{{LIGHT_INDEX}} *= mix(1., texture(texSpecular, texCoord).r, inTextureIntensities.SPECULAR);\n            #endif\n        #endif\n\n        vec3 diffuseColor{{LIGHT_INDEX}} = CalculateDiffuseColor(phongLightDirection{{LIGHT_INDEX}}, viewDirection, normal, lightColor{{LIGHT_INDEX}}, baseColor, phongLambert{{LIGHT_INDEX}});\n        vec3 specularColor{{LIGHT_INDEX}} = CalculateSpecularColor(\n            lightSpecular{{LIGHT_INDEX}},\n            inMaterialProperties.SPECULAR_AMT,\n            inMaterialProperties.SHININESS,\n            phongLightDirection{{LIGHT_INDEX}},\n            viewDirection,\n            normal,\n            phongLambert{{LIGHT_INDEX}}\n        );\n\n        vec3 combinedColor{{LIGHT_INDEX}} = (diffuseColor{{LIGHT_INDEX}} + specularColor{{LIGHT_INDEX}});\n\n        combinedColor{{LIGHT_INDEX}} *= phongLight{{LIGHT_INDEX}}.lightProperties.INTENSITY;\n\n        float attenuation{{LIGHT_INDEX}} = CalculateFalloff(\n            phongLightDistance{{LIGHT_INDEX}},\n            phongLightDirection{{LIGHT_INDEX}},\n            phongLight{{LIGHT_INDEX}}.lightProperties.FALLOFF,\n            phongLight{{LIGHT_INDEX}}.lightProperties.RADIUS\n        );\n\n        attenuation{{LIGHT_INDEX}} *= when_gt(phongLambert{{LIGHT_INDEX}}, 0.);\n        combinedColor{{LIGHT_INDEX}} *= attenuation{{LIGHT_INDEX}};\n\n        calculatedColor += combinedColor{{LIGHT_INDEX}};\n    }\n",snippet_body_spot_frag:"    // * SPOT LIGHT {{LIGHT_INDEX}} *\n    if (phongLight{{LIGHT_INDEX}}.castLight == 1) {\n        vec3 phongLightDirection{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.position - fragPos.xyz;\n        phongLightDirection{{LIGHT_INDEX}} = normalize( phongLightDirection{{LIGHT_INDEX}});\n        float phongLightDistance{{LIGHT_INDEX}} = length(phongLightDirection{{LIGHT_INDEX}});\n\n        float phongLambert{{LIGHT_INDEX}} = 1.; // inout variable\n\n        vec3 lightColor{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.color;\n        vec3 lightSpecular{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.specular;\n\n        #ifdef HAS_TEXTURES\n            #ifdef HAS_TEXTURE_AO\n                // lightColor{{LIGHT_INDEX}} *= mix(vec3(1.), texture(texAO, texCoord).rgb, inTextureIntensities.AO);\n                lightColor{{LIGHT_INDEX}} *= texture(texAO, texCoord).g, inTextureIntensities.AO;\n\n            #endif\n\n            #ifdef HAS_TEXTURE_SPECULAR\n                lightSpecular{{LIGHT_INDEX}} *= mix(1., texture(texSpecular, texCoord).r, inTextureIntensities.SPECULAR);\n            #endif\n        #endif\n\n        vec3 diffuseColor{{LIGHT_INDEX}} = CalculateDiffuseColor(phongLightDirection{{LIGHT_INDEX}}, viewDirection, normal, lightColor{{LIGHT_INDEX}}, baseColor, phongLambert{{LIGHT_INDEX}});\n        vec3 specularColor{{LIGHT_INDEX}} = CalculateSpecularColor(\n            lightSpecular{{LIGHT_INDEX}},\n            inMaterialProperties.SPECULAR_AMT,\n            inMaterialProperties.SHININESS,\n            phongLightDirection{{LIGHT_INDEX}},\n            viewDirection,\n            normal,\n            phongLambert{{LIGHT_INDEX}}\n        );\n\n        vec3 combinedColor{{LIGHT_INDEX}} = (diffuseColor{{LIGHT_INDEX}} + specularColor{{LIGHT_INDEX}});\n\n        float spotIntensity{{LIGHT_INDEX}} = CalculateSpotLightEffect(\n            phongLight{{LIGHT_INDEX}}.position, phongLight{{LIGHT_INDEX}}.conePointAt, phongLight{{LIGHT_INDEX}}.spotProperties.COSCONEANGLE,\n            phongLight{{LIGHT_INDEX}}.spotProperties.COSCONEANGLEINNER, phongLight{{LIGHT_INDEX}}.spotProperties.SPOTEXPONENT,\n            phongLightDirection{{LIGHT_INDEX}}\n        );\n\n        combinedColor{{LIGHT_INDEX}} *= spotIntensity{{LIGHT_INDEX}};\n\n        vec3 lightModelDiff{{LIGHT_INDEX}} = phongLight{{LIGHT_INDEX}}.position - fragPos.xyz;\n\n        float attenuation{{LIGHT_INDEX}} = CalculateFalloff(\n            phongLightDistance{{LIGHT_INDEX}},\n            phongLightDirection{{LIGHT_INDEX}},\n            phongLight{{LIGHT_INDEX}}.lightProperties.FALLOFF,\n            phongLight{{LIGHT_INDEX}}.lightProperties.RADIUS\n        );\n\n        attenuation{{LIGHT_INDEX}} *= when_gt(phongLambert{{LIGHT_INDEX}}, 0.);\n\n        combinedColor{{LIGHT_INDEX}} *= attenuation{{LIGHT_INDEX}};\n\n        combinedColor{{LIGHT_INDEX}} *= phongLight{{LIGHT_INDEX}}.lightProperties.INTENSITY;\n        calculatedColor += combinedColor{{LIGHT_INDEX}};\n    }",snippet_head_frag:"UNI Light phongLight{{LIGHT_INDEX}};\n",};
const cgl = op.patch.cgl;

const attachmentFragmentHead = attachments.snippet_head_frag;
const snippets = {
    "point": attachments.snippet_body_point_frag,
    "spot": attachments.snippet_body_spot_frag,
    "ambient": attachments.snippet_body_ambient_frag,
    "directional": attachments.snippet_body_directional_frag,
    "area": attachments.snippet_body_area_frag,
};
const LIGHT_INDEX_REGEX = new RegExp("{{LIGHT_INDEX}}", "g");

const createFragmentHead = (n) => attachmentFragmentHead.replace("{{LIGHT_INDEX}}", n);
const createFragmentBody = (n, type) => snippets[type].replace(LIGHT_INDEX_REGEX, n);

function createDefaultShader()
{
    const vertexShader = attachments.phong_vert;
    let fragmentShader = attachments.phong_frag;
    let fragmentHead = "";
    let fragmentBody = "";

    fragmentHead = fragmentHead.concat(createFragmentHead(0));
    fragmentBody = fragmentBody.concat(createFragmentBody(0, DEFAULT_LIGHTSTACK[0].type));

    fragmentShader = fragmentShader.replace(FRAGMENT_HEAD_REGEX, fragmentHead);
    fragmentShader = fragmentShader.replace(FRAGMENT_BODY_REGEX, fragmentBody);

    shader.setSource(vertexShader, fragmentShader);
    shader.define("HAS_POINT");
    shader.removeDefine("HAS_SPOT");
    shader.removeDefine("HAS_DIRECTIONAL");
    shader.removeDefine("HAS_AMBIENT");
}

const inTrigger = op.inTrigger("Trigger In");

// * DIFFUSE *
const inDiffuseR = op.inFloat("R", Math.random());
const inDiffuseG = op.inFloat("G", Math.random());
const inDiffuseB = op.inFloat("B", Math.random());
const inDiffuseA = op.inFloatSlider("A", 1);
const diffuseColors = [inDiffuseR, inDiffuseG, inDiffuseB, inDiffuseA];
op.setPortGroup("Diffuse Color", diffuseColors);

const inToggleOrenNayar = op.inBool("Enable", false);
const inAlbedo = op.inFloatSlider("Albedo", 0.707);
const inRoughness = op.inFloatSlider("Roughness", 0.835);

inToggleOrenNayar.setUiAttribs({ "hidePort": true });
inAlbedo.setUiAttribs({ "greyout": true });
inRoughness.setUiAttribs({ "greyout": true });
inDiffuseR.setUiAttribs({ "colorPick": true });
op.setPortGroup("Oren-Nayar Diffuse", [inToggleOrenNayar, inAlbedo, inRoughness]);

inToggleOrenNayar.onChange = function ()
{
    shader.toggleDefine("ENABLE_OREN_NAYAR_DIFFUSE", inToggleOrenNayar);
    inAlbedo.setUiAttribs({ "greyout": !inToggleOrenNayar.get() });
    inRoughness.setUiAttribs({ "greyout": !inToggleOrenNayar.get() });
};

// * FRESNEL *
const inToggleFresnel = op.inValueBool("Active", false);
inToggleFresnel.setUiAttribs({ "hidePort": true });
const inFresnel = op.inValueSlider("Fresnel Intensity", 0.7);
const inFresnelWidth = op.inFloat("Fresnel Width", 1);
const inFresnelExponent = op.inFloat("Fresnel Exponent", 6);
const inFresnelR = op.inFloat("Fresnel R", 1);
const inFresnelG = op.inFloat("Fresnel G", 1);
const inFresnelB = op.inFloat("Fresnel B", 1);
inFresnelR.setUiAttribs({ "colorPick": true });

const fresnelArr = [inFresnel, inFresnelWidth, inFresnelExponent, inFresnelR, inFresnelG, inFresnelB];
fresnelArr.forEach(function (port) { port.setUiAttribs({ "greyout": true }); });
op.setPortGroup("Fresnel", fresnelArr.concat([inToggleFresnel]));

let uniFresnel = null;
let uniFresnelWidthExponent = null;
inToggleFresnel.onChange = function ()
{
    shader.toggleDefine("ENABLE_FRESNEL", inToggleFresnel);
    if (inToggleFresnel.get())
    {
        if (!uniFresnel) uniFresnel = new CGL.Uniform(shader, "4f", "inFresnel", inFresnelR, inFresnelG, inFresnelB, inFresnel);
        if (!uniFresnelWidthExponent) uniFresnelWidthExponent = new CGL.Uniform(shader, "2f", "inFresnelWidthExponent", inFresnelWidth, inFresnelExponent);
    }
    else
    {
        if (uniFresnel)
        {
            shader.removeUniform("inFresnel");
            uniFresnel = null;
        }

        if (uniFresnelWidthExponent)
        {
            shader.removeUniform("inFresnelWidthExponent");
            uniFresnelWidthExponent = null;
        }
    }

    fresnelArr.forEach(function (port) { port.setUiAttribs({ "greyout": !inToggleFresnel.get() }); });
};
// * EMISSIVE *
const inEmissiveActive = op.inBool("Emissive Active", false);
const inEmissiveColorIntensity = op.inFloatSlider("Color Intensity", 0.3);
const inEmissiveR = op.inFloatSlider("Emissive R", Math.random());
const inEmissiveG = op.inFloatSlider("Emissive G", Math.random());
const inEmissiveB = op.inFloatSlider("Emissive B", Math.random());
inEmissiveR.setUiAttribs({ "colorPick": true });
op.setPortGroup("Emissive Color", [inEmissiveActive, inEmissiveColorIntensity, inEmissiveR, inEmissiveG, inEmissiveB]);

inEmissiveColorIntensity.setUiAttribs({ "greyout": !inEmissiveActive.get() });
inEmissiveR.setUiAttribs({ "greyout": !inEmissiveActive.get() });
inEmissiveG.setUiAttribs({ "greyout": !inEmissiveActive.get() });
inEmissiveB.setUiAttribs({ "greyout": !inEmissiveActive.get() });

let uniEmissiveColor = null;

inEmissiveActive.onChange = () =>
{
    shader.toggleDefine("ADD_EMISSIVE_COLOR", inEmissiveActive);

    if (inEmissiveActive.get())
    {
        uniEmissiveColor = new CGL.Uniform(shader, "4f", "inEmissiveColor", inEmissiveR, inEmissiveG, inEmissiveB, inEmissiveColorIntensity);
        inEmissiveTexture.setUiAttribs({ "greyout": false });
        inEmissiveMaskTexture.setUiAttribs({ "greyout": false });

        if (inEmissiveTexture.get()) inEmissiveIntensity.setUiAttribs({ "greyout": false });
        if (inEmissiveMaskTexture.get()) inEmissiveMaskIntensity.setUiAttribs({ "greyout": false });
    }
    else
    {
        op.log("ayayay");
        inEmissiveTexture.setUiAttribs({ "greyout": true });
        inEmissiveMaskTexture.setUiAttribs({ "greyout": true });
        inEmissiveIntensity.setUiAttribs({ "greyout": true });
        inEmissiveMaskIntensity.setUiAttribs({ "greyout": true });

        shader.removeUniform("inEmissiveColor");
        uniEmissiveColor = null;
    }

    if (inEmissiveTexture.get())
    {
        inEmissiveColorIntensity.setUiAttribs({ "greyout": true });
        inEmissiveR.setUiAttribs({ "greyout": true });
        inEmissiveG.setUiAttribs({ "greyout": true });
        inEmissiveB.setUiAttribs({ "greyout": true });
    }
    else
    {
        if (inEmissiveActive.get())
        {
            inEmissiveColorIntensity.setUiAttribs({ "greyout": false });
            inEmissiveR.setUiAttribs({ "greyout": false });
            inEmissiveG.setUiAttribs({ "greyout": false });
            inEmissiveB.setUiAttribs({ "greyout": false });
        }
        else
        {
            inEmissiveColorIntensity.setUiAttribs({ "greyout": true });
            inEmissiveR.setUiAttribs({ "greyout": true });
            inEmissiveG.setUiAttribs({ "greyout": true });
            inEmissiveB.setUiAttribs({ "greyout": true });
        }
    }
};
// * SPECULAR *
const inShininess = op.inFloat("Shininess", 4);
const inSpecularCoefficient = op.inFloatSlider("Specular Amount", 0.5);
const inSpecularMode = op.inSwitch("Specular Model", ["Blinn", "Schlick", "Phong", "Gauss"], "Blinn");

inSpecularMode.setUiAttribs({ "hidePort": true });
const specularColors = [inShininess, inSpecularCoefficient, inSpecularMode];
op.setPortGroup("Specular", specularColors);

// * LIGHT *
const inEnergyConservation = op.inValueBool("Energy Conservation", false);
const inToggleDoubleSided = op.inBool("Double Sided Material", false);
const inFalloffMode = op.inSwitch("Falloff Mode", ["A", "B", "C", "D"], "A");
inEnergyConservation.setUiAttribs({ "hidePort": true });
inToggleDoubleSided.setUiAttribs({ "hidePort": true });
inFalloffMode.setUiAttribs({ "hidePort": true });
inFalloffMode.onChange = () =>
{
    const MODES = ["A", "B", "C", "D"];
    shader.define("FALLOFF_MODE_" + inFalloffMode.get());
    MODES.filter((mode) => mode !== inFalloffMode.get())
        .forEach((mode) => shader.removeDefine("FALLOFF_MODE_" + mode));
};

const lightProps = [inEnergyConservation, inToggleDoubleSided, inFalloffMode];
op.setPortGroup("Light Options", lightProps);

// TEXTURES
const inDiffuseTexture = op.inTexture("Diffuse Texture");
const inSpecularTexture = op.inTexture("Specular Texture");
const inNormalTexture = op.inTexture("Normal Map");
const inAoTexture = op.inTexture("AO Texture");
const inEmissiveTexture = op.inTexture("Emissive Texture");
const inEmissiveMaskTexture = op.inTexture("Emissive Mask");
const inAlphaTexture = op.inTexture("Opacity Texture");
const inEnvTexture = op.inTexture("Environment Map");
const inLuminanceMaskTexture = op.inTexture("Env Map Mask");
op.setPortGroup("Textures", [inDiffuseTexture, inSpecularTexture, inNormalTexture, inAoTexture, inEmissiveTexture, inEmissiveMaskTexture, inAlphaTexture, inEnvTexture, inLuminanceMaskTexture]);

// TEXTURE TRANSFORMS
const inColorizeTexture = op.inBool("Colorize Texture", false);
const inDiffuseRepeatX = op.inFloat("Diffuse Repeat X", 1);
const inDiffuseRepeatY = op.inFloat("Diffuse Repeat Y", 1);
const inTextureOffsetX = op.inFloat("Texture Offset X", 0);
const inTextureOffsetY = op.inFloat("Texture Offset Y", 0);

const inSpecularIntensity = op.inFloatSlider("Specular Intensity", 1);
const inNormalIntensity = op.inFloatSlider("Normal Map Intensity", 0.5);
const inAoIntensity = op.inFloatSlider("AO Intensity", 1);
const inEmissiveIntensity = op.inFloatSlider("Emissive Intensity", 1);
const inEmissiveMaskIntensity = op.inFloatSlider("Emissive Mask Intensity", 1);
const inEnvMapIntensity = op.inFloatSlider("Env Map Intensity", 1);
const inLuminanceMaskIntensity = op.inFloatSlider("Env Mask Intensity", 1);

inColorizeTexture.setUiAttribs({ "hidePort": true });
op.setPortGroup("Texture Transforms", [inColorizeTexture, inDiffuseRepeatY, inDiffuseRepeatX, inTextureOffsetY, inTextureOffsetX]);
op.setPortGroup("Texture Intensities", [inNormalIntensity, inAoIntensity, inSpecularIntensity, inEmissiveIntensity, inEmissiveMaskIntensity, inEnvMapIntensity, inLuminanceMaskIntensity]);
const alphaMaskSource = op.inSwitch("Alpha Mask Source", ["Luminance", "R", "G", "B", "A"], "Luminance");
alphaMaskSource.setUiAttribs({ "greyout": true });

const discardTransPxl = op.inValueBool("Discard Transparent Pixels");
discardTransPxl.setUiAttribs({ "hidePort": true });

op.setPortGroup("Opacity Texture", [alphaMaskSource, discardTransPxl]);

const outTrigger = op.outTrigger("Trigger Out");
const shaderOut = op.outObject("Shader", null, "shader");
shaderOut.ignoreValueSerialize = true;

const shader = new CGL.Shader(cgl, "phongmaterial_" + op.id);
shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG", "MODULE_BASE_COLOR"]);
shader.setSource(attachments.simosphong_vert, attachments.simosphong_frag);
let recompileShader = false;
shader.define("FALLOFF_MODE_A");

if (cgl.glVersion < 2)
{
    shader.enableExtension("GL_OES_standard_derivatives");

    if (cgl.gl.getExtension("OES_texture_float")) shader.enableExtension("GL_OES_texture_float");
    else op.log("error loading extension OES_texture_float");

    if (cgl.gl.getExtension("OES_texture_float_linear")) shader.enableExtension("GL_OES_texture_float_linear");
    else op.log("error loading extention OES_texture_float_linear");

    if (cgl.gl.getExtension("GL_OES_texture_half_float")) shader.enableExtension("GL_OES_texture_half_float");
    else op.log("error loading extention GL_OES_texture_half_float");

    if (cgl.gl.getExtension("GL_OES_texture_half_float_linear")) shader.enableExtension("GL_OES_texture_half_float_linear");
    else op.log("error loading extention GL_OES_texture_half_float_linear");
}

const FRAGMENT_HEAD_REGEX = new RegExp("{{PHONG_FRAGMENT_HEAD}}", "g");
const FRAGMENT_BODY_REGEX = new RegExp("{{PHONG_FRAGMENT_BODY}}", "g");

const hasLight = {
    "directional": false,
    "spot": false,
    "ambient": false,
    "point": false,
};

function createShader(lightStack)
{
    let fragmentShader = attachments.phong_frag;

    let fragmentHead = "";
    let fragmentBody = "";

    hasLight.directional = false;
    hasLight.spot = false;
    hasLight.ambient = false;
    hasLight.point = false;

    for (let i = 0; i < lightStack.length; i += 1)
    {
        const light = lightStack[i];

        const type = light.type;

        if (!hasLight[type])
        {
            hasLight[type] = true;
        }

        fragmentHead = fragmentHead.concat(createFragmentHead(i));
        fragmentBody = fragmentBody.concat(createFragmentBody(i, light.type));
    }

    fragmentShader = fragmentShader.replace(FRAGMENT_HEAD_REGEX, fragmentHead);
    fragmentShader = fragmentShader.replace(FRAGMENT_BODY_REGEX, fragmentBody);

    shader.setSource(attachments.phong_vert, fragmentShader);

    for (let i = 0, keys = Object.keys(hasLight); i < keys.length; i += 1)
    {
        const key = keys[i];

        if (hasLight[key])
        {
            if (!shader.hasDefine("HAS_" + key.toUpperCase()))
            {
                shader.define("HAS_" + key.toUpperCase());
            }
        }
        else
        {
            if (shader.hasDefine("HAS_" + key.toUpperCase()))
            {
                shader.removeDefine("HAS_" + key.toUpperCase());
            }
        }
    }
}

shaderOut.set(shader);

let diffuseTextureUniform = null;
let specularTextureUniform = null;
let normalTextureUniform = null;
let aoTextureUniform = null;
let emissiveTextureUniform = null;
let emissiveMaskTextureUniform = null;
let emissiveMaskIntensityUniform = null;
let alphaTextureUniform = null;
let envTextureUniform = null;
let inEnvMapIntensityUni = null;
let inEnvMapWidthUni = null;
let luminanceTextureUniform = null;
let inLuminanceMaskIntensityUniform = null;

inColorizeTexture.onChange = function ()
{
    shader.toggleDefine("COLORIZE_TEXTURE", inColorizeTexture.get());
};

function updateDiffuseTexture()
{
    if (inDiffuseTexture.get())
    {
        if (!shader.hasDefine("HAS_TEXTURE_DIFFUSE"))
        {
            shader.define("HAS_TEXTURE_DIFFUSE");
            if (!diffuseTextureUniform) diffuseTextureUniform = new CGL.Uniform(shader, "t", "texDiffuse", 0);
        }
    }
    else
    {
        shader.removeUniform("texDiffuse");
        shader.removeDefine("HAS_TEXTURE_DIFFUSE");
        diffuseTextureUniform = null;
    }
}

function updateSpecularTexture()
{
    if (inSpecularTexture.get())
    {
        inSpecularIntensity.setUiAttribs({ "greyout": false });
        if (!shader.hasDefine("HAS_TEXTURE_SPECULAR"))
        {
            shader.define("HAS_TEXTURE_SPECULAR");
            if (!specularTextureUniform) specularTextureUniform = new CGL.Uniform(shader, "t", "texSpecular", 0);
        }
    }
    else
    {
        inSpecularIntensity.setUiAttribs({ "greyout": true });
        shader.removeUniform("texSpecular");
        shader.removeDefine("HAS_TEXTURE_SPECULAR");
        specularTextureUniform = null;
    }
}

function updateNormalTexture()
{
    if (inNormalTexture.get())
    {
        inNormalIntensity.setUiAttribs({ "greyout": false });

        if (!shader.hasDefine("HAS_TEXTURE_NORMAL"))
        {
            shader.define("HAS_TEXTURE_NORMAL");
            if (!normalTextureUniform) normalTextureUniform = new CGL.Uniform(shader, "t", "texNormal", 0);
        }
    }
    else
    {
        inNormalIntensity.setUiAttribs({ "greyout": true });

        shader.removeUniform("texNormal");
        shader.removeDefine("HAS_TEXTURE_NORMAL");
        normalTextureUniform = null;
    }
}

aoTextureUniform = new CGL.Uniform(shader, "t", "texAO");

function updateAoTexture()
{
    shader.toggleDefine("HAS_TEXTURE_AO", inAoTexture.get());

    inAoIntensity.setUiAttribs({ "greyout": !inAoTexture.get() });

    // if (inAoTexture.get())
    // {
    //     // inAoIntensity.setUiAttribs({ "greyout": false });

    //     // if (!shader.hasDefine("HAS_TEXTURE_AO"))
    //     // {
    //         // shader.define("HAS_TEXTURE_AO");
    //         // if (!aoTextureUniform)
    //         aoTextureUniform = new CGL.Uniform(shader, "t", "texAO", 0);
    //     // }
    // }
    // else
    // {
    //     // inAoIntensity.setUiAttribs({ "greyout": true });

    //     shader.removeUniform("texAO");
    //     // shader.removeDefine("HAS_TEXTURE_AO");
    //     aoTextureUniform = null;
    // }
}

function updateEmissiveTexture()
{
    if (inEmissiveTexture.get())
    {
        inEmissiveR.setUiAttribs({ "greyout": true });
        inEmissiveG.setUiAttribs({ "greyout": true });
        inEmissiveB.setUiAttribs({ "greyout": true });
        inEmissiveColorIntensity.setUiAttribs({ "greyout": true });

        if (inEmissiveActive.get())
        {
            inEmissiveIntensity.setUiAttribs({ "greyout": false });
        }

        if (!shader.hasDefine("HAS_TEXTURE_EMISSIVE"))
        {
            shader.define("HAS_TEXTURE_EMISSIVE");
            if (!emissiveTextureUniform) emissiveTextureUniform = new CGL.Uniform(shader, "t", "texEmissive", 0);
        }
    }
    else
    {
        inEmissiveIntensity.setUiAttribs({ "greyout": true });

        if (inEmissiveActive.get())
        {
            inEmissiveR.setUiAttribs({ "greyout": false });
            inEmissiveG.setUiAttribs({ "greyout": false });
            inEmissiveB.setUiAttribs({ "greyout": false });
            inEmissiveColorIntensity.setUiAttribs({ "greyout": false });
        }
        else
        {
            inEmissiveTexture.setUiAttribs({ "greyout": true });
        }

        shader.removeUniform("texEmissive");
        shader.removeDefine("HAS_TEXTURE_EMISSIVE");
        emissiveTextureUniform = null;
    }
}

function updateEmissiveMaskTexture()
{
    if (inEmissiveMaskTexture.get())
    { // we have a emissive texture
        if (inEmissiveActive.get())
        {
            inEmissiveMaskIntensity.setUiAttribs({ "greyout": false });
        }

        if (!shader.hasDefine("HAS_TEXTURE_EMISSIVE_MASK"))
        {
            shader.define("HAS_TEXTURE_EMISSIVE_MASK");
            if (!emissiveMaskTextureUniform) emissiveMaskTextureUniform = new CGL.Uniform(shader, "t", "texMaskEmissive", 0);
            if (!emissiveMaskIntensityUniform) emissiveMaskIntensityUniform = new CGL.Uniform(shader, "f", "inEmissiveMaskIntensity", inEmissiveMaskIntensity);
        }
    }
    else
    {
        if (!inEmissiveActive.get())
        {
            inEmissiveMaskTexture.setUiAttribs({ "greyout": true });
        }
        inEmissiveMaskIntensity.setUiAttribs({ "greyout": true });
        shader.removeUniform("texMaskEmissive");
        shader.removeUniform("inEmissiveMaskIntensity");
        shader.removeDefine("HAS_TEXTURE_EMISSIVE_MASK");
        emissiveMaskTextureUniform = null;
        emissiveMaskIntensityUniform = null;
    }
}

let updateEnvTextureLater = false;
function updateEnvTexture()
{
    shader.toggleDefine("HAS_TEXTURE_ENV", inEnvTexture.get());

    inEnvMapIntensity.setUiAttribs({ "greyout": !inEnvTexture.get() });

    if (inEnvTexture.get())
    {
        if (!envTextureUniform) envTextureUniform = new CGL.Uniform(shader, "t", "texEnv", 0);

        shader.toggleDefine("TEX_FORMAT_CUBEMAP", inEnvTexture.get().cubemap);

        if (inEnvTexture.get().cubemap)
        {
            shader.removeDefine("TEX_FORMAT_EQUIRECT");
            shader.removeDefine("ENVMAP_MATCAP");
            if (!inEnvMapIntensityUni)inEnvMapIntensityUni = new CGL.Uniform(shader, "f", "inEnvMapIntensity", inEnvMapIntensity);
            if (!inEnvMapWidthUni)inEnvMapWidthUni = new CGL.Uniform(shader, "f", "inEnvMapWidth", inEnvTexture.get().cubemap.width);
        }
        else
        {
            const isSquare = inEnvTexture.get().width === inEnvTexture.get().height;
            shader.toggleDefine("TEX_FORMAT_EQUIRECT", !isSquare);
            shader.toggleDefine("ENVMAP_MATCAP", isSquare);

            if (!inEnvMapIntensityUni)inEnvMapIntensityUni = new CGL.Uniform(shader, "f", "inEnvMapIntensity", inEnvMapIntensity);
            if (!inEnvMapWidthUni) inEnvMapWidthUni = new CGL.Uniform(shader, "f", "inEnvMapWidth", inEnvTexture.get().width);
        }
    }
    else
    {
        shader.removeUniform("inEnvMapIntensity");
        shader.removeUniform("inEnvMapWidth");
        shader.removeUniform("texEnv");
        shader.removeDefine("HAS_TEXTURE_ENV");
        shader.removeDefine("ENVMAP_MATCAP");
        envTextureUniform = null;
        inEnvMapIntensityUni = null;
    }
    updateEnvTextureLater = false;
}

function updateLuminanceMaskTexture()
{
    if (inLuminanceMaskTexture.get())
    {
        inLuminanceMaskIntensity.setUiAttribs({ "greyout": false });
        if (!luminanceTextureUniform)
        {
            shader.define("HAS_TEXTURE_LUMINANCE_MASK");
            luminanceTextureUniform = new CGL.Uniform(shader, "t", "texLuminance", 0);
            inLuminanceMaskIntensityUniform = new CGL.Uniform(shader, "f", "inLuminanceMaskIntensity", inLuminanceMaskIntensity);
        }
    }
    else
    {
        inLuminanceMaskIntensity.setUiAttribs({ "greyout": true });
        shader.removeDefine("HAS_TEXTURE_LUMINANCE_MASK");
        shader.removeUniform("inLuminanceMaskIntensity");
        shader.removeUniform("texLuminance");
        luminanceTextureUniform = null;
        inLuminanceMaskIntensityUniform = null;
    }
}

// TEX OPACITY

function updateAlphaMaskMethod()
{
    if (alphaMaskSource.get() == "Alpha Channel") shader.define("ALPHA_MASK_ALPHA");
    else shader.removeDefine("ALPHA_MASK_ALPHA");

    if (alphaMaskSource.get() == "Luminance") shader.define("ALPHA_MASK_LUMI");
    else shader.removeDefine("ALPHA_MASK_LUMI");

    if (alphaMaskSource.get() == "R") shader.define("ALPHA_MASK_R");
    else shader.removeDefine("ALPHA_MASK_R");

    if (alphaMaskSource.get() == "G") shader.define("ALPHA_MASK_G");
    else shader.removeDefine("ALPHA_MASK_G");

    if (alphaMaskSource.get() == "B") shader.define("ALPHA_MASK_B");
    else shader.removeDefine("ALPHA_MASK_B");
}

alphaMaskSource.onChange = updateAlphaMaskMethod;

function updateAlphaTexture()
{
    if (inAlphaTexture.get())
    {
        if (alphaTextureUniform !== null) return;
        shader.removeUniform("texAlpha");
        shader.define("HAS_TEXTURE_ALPHA");
        if (!alphaTextureUniform) alphaTextureUniform = new CGL.Uniform(shader, "t", "texAlpha", 0);

        alphaMaskSource.setUiAttribs({ "greyout": false });
        discardTransPxl.setUiAttribs({ "greyout": false });
    }
    else
    {
        shader.removeUniform("texAlpha");
        shader.removeDefine("HAS_TEXTURE_ALPHA");
        alphaTextureUniform = null;

        alphaMaskSource.setUiAttribs({ "greyout": true });
        discardTransPxl.setUiAttribs({ "greyout": true });
    }
    updateAlphaMaskMethod();
}

discardTransPxl.onChange = function ()
{
    shader.toggleDefine("DISCARDTRANS", discardTransPxl.get());
};

inDiffuseTexture.onChange = updateDiffuseTexture;
inSpecularTexture.onChange = updateSpecularTexture;
inNormalTexture.onChange = updateNormalTexture;
inAoTexture.onChange = updateAoTexture;
inEmissiveTexture.onChange = updateEmissiveTexture;
inEmissiveMaskTexture.onChange = updateEmissiveMaskTexture;
inAlphaTexture.onChange = updateAlphaTexture;
inEnvTexture.onChange = () => { updateEnvTextureLater = true; };
inLuminanceMaskTexture.onChange = updateLuminanceMaskTexture;

const MAX_UNIFORM_FRAGMENTS = cgl.maxUniformsFrag;
const MAX_LIGHTS = MAX_UNIFORM_FRAGMENTS === 64 ? 6 : 16;

shader.define("MAX_LIGHTS", MAX_LIGHTS.toString());
shader.define("SPECULAR_PHONG");

inSpecularMode.onChange = function ()
{
    if (inSpecularMode.get() === "Phong")
    {
        shader.define("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_GAUSS");
        shader.removeDefine("SPECULAR_SCHLICK");
    }
    else if (inSpecularMode.get() === "Blinn")
    {
        shader.define("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_GAUSS");
        shader.removeDefine("SPECULAR_SCHLICK");
    }
    else if (inSpecularMode.get() === "Gauss")
    {
        shader.define("SPECULAR_GAUSS");
        shader.removeDefine("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_SCHLICK");
    }
    else if (inSpecularMode.get() === "Schlick")
    {
        shader.define("SPECULAR_SCHLICK");
        shader.removeDefine("SPECULAR_BLINN");
        shader.removeDefine("SPECULAR_PHONG");
        shader.removeDefine("SPECULAR_GAUSS");
    }
};

inEnergyConservation.onChange = function ()
{
    shader.toggleDefine("CONSERVE_ENERGY", inEnergyConservation.get());
};

inToggleDoubleSided.onChange = function ()
{
    shader.toggleDefine("DOUBLE_SIDED", inToggleDoubleSided.get());
};

// * INIT UNIFORMS *

const uniMaterialProps = new CGL.Uniform(shader, "4f", "inMaterialProperties", inAlbedo, inRoughness, inShininess, inSpecularCoefficient);
const uniDiffuseColor = new CGL.Uniform(shader, "4f", "inDiffuseColor", inDiffuseR, inDiffuseG, inDiffuseB, inDiffuseA);
const uniTextureIntensities = new CGL.Uniform(shader, "4f", "inTextureIntensities", inNormalIntensity, inAoIntensity, inSpecularIntensity, inEmissiveIntensity);
const uniTextureRepeatOffset = new CGL.Uniform(shader, "4f", "inTextureRepeatOffset", inDiffuseRepeatX, inDiffuseRepeatY, inTextureOffsetX, inTextureOffsetY);

shader.uniformColorDiffuse = uniDiffuseColor;

const lightUniforms = [];
let oldCount = 0;

function createUniforms(lightsCount)
{
    for (let i = 0; i < lightUniforms.length; i += 1)
    {
        lightUniforms[i] = null;
    }

    for (let i = 0; i < lightsCount; i += 1)
    {
        lightUniforms[i] = null;
        if (!lightUniforms[i])
        {
            lightUniforms[i] = {
                "color": new CGL.Uniform(shader, "3f", "phongLight" + i + ".color", [1, 1, 1]),
                "position": new CGL.Uniform(shader, "3f", "phongLight" + i + ".position", [0, 11, 0]),
                "specular": new CGL.Uniform(shader, "3f", "phongLight" + i + ".specular", [1, 1, 1]),
                // intensity, attenuation, falloff, radius
                "lightProperties": new CGL.Uniform(shader, "4f", "phongLight" + i + ".lightProperties", [1, 1, 1, 1]),

                "conePointAt": new CGL.Uniform(shader, "3f", "phongLight" + i + ".conePointAt", vec3.create()),
                "spotProperties": new CGL.Uniform(shader, "3f", "phongLight" + i + ".spotProperties", [0, 0, 0, 0]),
                "castLight": new CGL.Uniform(shader, "i", "phongLight" + i + ".castLight", 1),

            };
        }
    }
}

function setDefaultUniform(light)
{
    defaultUniform.position.setValue(light.position);
    defaultUniform.color.setValue(light.color);
    defaultUniform.specular.setValue(light.specular);
    defaultUniform.lightProperties.setValue([
        light.intensity,
        light.attenuation,
        light.falloff,
        light.radius,
    ]);

    defaultUniform.conePointAt.setValue(light.conePointAt);
    defaultUniform.spotProperties.setValue([
        light.cosConeAngle,
        light.cosConeAngleInner,
        light.spotExponent,
    ]);
}

function setUniforms(lightStack)
{
    for (let i = 0; i < lightStack.length; i += 1)
    {
        const light = lightStack[i];
        light.isUsed = true;

        lightUniforms[i].position.setValue(light.position);
        lightUniforms[i].color.setValue(light.color);
        lightUniforms[i].specular.setValue(light.specular);

        lightUniforms[i].lightProperties.setValue([
            light.intensity,
            light.attenuation,
            light.falloff,
            light.radius,
        ]);

        lightUniforms[i].conePointAt.setValue(light.conePointAt);
        lightUniforms[i].spotProperties.setValue([
            light.cosConeAngle,
            light.cosConeAngleInner,
            light.spotExponent,
        ]);

        lightUniforms[i].castLight.setValue(light.castLight);
    }
}

function compareLights(lightStack)
{
    if (lightStack.length !== oldCount)
    {
        createShader(lightStack);
        createUniforms(lightStack.length);
        oldCount = lightStack.length;
        setUniforms(lightStack);
        recompileShader = false;
    }
    else
    {
        if (recompileShader)
        {
            createShader(lightStack);
            createUniforms(lightStack.length);
            recompileShader = false;
        }
        setUniforms(lightStack);
    }
}

let defaultUniform = null;

function createDefaultUniform()
{
    defaultUniform = {
        "color": new CGL.Uniform(shader, "3f", "phongLight" + 0 + ".color", [1, 1, 1]),
        "specular": new CGL.Uniform(shader, "3f", "phongLight" + 0 + ".specular", [1, 1, 1]),
        "position": new CGL.Uniform(shader, "3f", "phongLight" + 0 + ".position", [0, 11, 0]),
        // intensity, attenuation, falloff, radius
        "lightProperties": new CGL.Uniform(shader, "4f", "phongLight" + 0 + ".lightProperties", [1, 1, 1, 1]),
        "conePointAt": new CGL.Uniform(shader, "3f", "phongLight" + 0 + ".conePointAt", vec3.create()),
        "spotProperties": new CGL.Uniform(shader, "3f", "phongLight" + 0 + ".spotProperties", [0, 0, 0, 0]),
        "castLight": new CGL.Uniform(shader, "i", "phongLight" + 0 + ".castLight", 1),
    };
}

const DEFAULT_LIGHTSTACK = [{
    "type": "point",
    "position": [5, 5, 5],
    "color": [1, 1, 1],
    "specular": [1, 1, 1],
    "intensity": 1,
    "attenuation": 0,
    "falloff": 0.5,
    "radius": 80,
    "castLight": 1,
}];

const iViewMatrix = mat4.create();

function updateLights()
{
    if (cgl.frameStore.lightStack)
    {
        if (cgl.frameStore.lightStack.length === 0)
        {
            op.setUiError("deflight", "Default light is enabled. Please add lights to your patch to make this warning disappear.", 1);
        }
        else op.setUiError("deflight", null);
    }

    if ((!cgl.frameStore.lightStack || !cgl.frameStore.lightStack.length))
    {
        // if no light in light stack, use default light & set count to -1
        // so when a new light gets added, the shader does recompile
        if (!defaultUniform)
        {
            createDefaultShader();
            createDefaultUniform();
        }

        mat4.invert(iViewMatrix, cgl.vMatrix);
        // set default light position to camera position
        DEFAULT_LIGHTSTACK[0].position = [iViewMatrix[12], iViewMatrix[13], iViewMatrix[14]];
        setDefaultUniform(DEFAULT_LIGHTSTACK[0]);

        oldCount = -1;
    }
    else
    {
        if (shader)
        {
            if (cgl.frameStore.lightStack)
            {
                if (cgl.frameStore.lightStack.length)
                {
                    defaultUniform = null;
                    compareLights(cgl.frameStore.lightStack);
                }
            }
        }
    }
}

const render = function ()
{
    if (!shader)
    {
        op.log("NO SHADER");
        return;
    }

    cgl.pushShader(shader);
    shader.popTextures();

    outTrigger.trigger();
    cgl.popShader();
};

op.preRender = function ()
{
    shader.bind();
    render();
};

/* transform for default light */
const inverseViewMat = mat4.create();
const vecTemp = vec3.create();
const camPos = vec3.create();

inTrigger.onTriggered = function ()
{
    if (!shader)
    {
        op.log("phong has no shader...");
        return;
    }

    if (updateEnvTextureLater)updateEnvTexture();

    cgl.setShader(shader);

    shader.popTextures();

    if (inDiffuseTexture.get()) shader.pushTexture(diffuseTextureUniform, inDiffuseTexture.get());
    if (inSpecularTexture.get()) shader.pushTexture(specularTextureUniform, inSpecularTexture.get());
    if (inNormalTexture.get()) shader.pushTexture(normalTextureUniform, inNormalTexture.get());
    if (inAoTexture.get()) shader.pushTexture(aoTextureUniform, inAoTexture.get());
    if (inEmissiveTexture.get()) shader.pushTexture(emissiveTextureUniform, inEmissiveTexture.get());
    if (inEmissiveMaskTexture.get()) shader.pushTexture(emissiveMaskTextureUniform, inEmissiveMaskTexture.get());
    if (inAlphaTexture.get()) shader.pushTexture(alphaTextureUniform, inAlphaTexture.get());
    if (inEnvTexture.get())
    {
        if (inEnvTexture.get().cubemap) shader.pushTexture(envTextureUniform, inEnvTexture.get().cubemap, cgl.gl.TEXTURE_CUBE_MAP);
        else shader.pushTexture(envTextureUniform, inEnvTexture.get());
    }

    if (inLuminanceMaskTexture.get())
    {
        shader.pushTexture(luminanceTextureUniform, inLuminanceMaskTexture.get());
    }

    updateLights();

    outTrigger.trigger();

    cgl.setPreviousShader();
};

if (cgl.glVersion == 1)
{
    if (!cgl.gl.getExtension("EXT_shader_texture_lod"))
    {
        op.log("no EXT_shader_texture_lod texture extension");
        // throw "no EXT_shader_texture_lod texture extension";
    }
    else
    {
        shader.enableExtension("GL_EXT_shader_texture_lod");
        cgl.gl.getExtension("OES_texture_float");
        cgl.gl.getExtension("OES_texture_float_linear");
        cgl.gl.getExtension("OES_texture_half_float");
        cgl.gl.getExtension("OES_texture_half_float_linear");

        shader.enableExtension("GL_OES_standard_derivatives");
        shader.enableExtension("GL_OES_texture_float");
        shader.enableExtension("GL_OES_texture_float_linear");
        shader.enableExtension("GL_OES_texture_half_float");
        shader.enableExtension("GL_OES_texture_half_float_linear");
    }
}

updateDiffuseTexture();
updateSpecularTexture();
updateNormalTexture();
updateAoTexture();
updateAlphaTexture();
updateEmissiveTexture();
updateEmissiveMaskTexture();
updateEnvTexture();
updateLuminanceMaskTexture();


};

Ops.Gl.Phong.PhongMaterial_v6.prototype = new CABLES.Op();
CABLES.OPS["0d83ed06-cdbe-4fe0-87bb-0ccece7fb6e1"]={f:Ops.Gl.Phong.PhongMaterial_v6,objName:"Ops.Gl.Phong.PhongMaterial_v6"};




// **************************************************************
// 
// Ops.Gl.Phong.SpotLight_v5
// 
// **************************************************************

Ops.Gl.Phong.SpotLight_v5 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const cgl = op.patch.cgl;

// * OP START *
const inTrigger = op.inTrigger("Trigger In");

const inCastLight = op.inBool("Cast Light", true);
const inIntensity = op.inFloat("Intensity", 2);
const inRadius = op.inFloat("Radius", 10);

const inPosX = op.inFloat("X", 1);
const inPosY = op.inFloat("Y", 3);
const inPosZ = op.inFloat("Z", 1);

const positionIn = [inPosX, inPosY, inPosZ];
op.setPortGroup("Position", positionIn);

const inPointAtX = op.inFloat("Point At X", 0);
const inPointAtY = op.inFloat("Point At Y", 0);
const inPointAtZ = op.inFloat("Point At Z", 0);
const pointAtIn = [inPointAtX, inPointAtY, inPointAtZ];
op.setPortGroup("Point At", pointAtIn);

const inR = op.inFloatSlider("R", 1);
const inG = op.inFloatSlider("G", 1);
const inB = op.inFloatSlider("B", 1);
inR.setUiAttribs({ "colorPick": true });
const colorIn = [inR, inG, inB];
op.setPortGroup("Color", colorIn);

const inSpecularR = op.inFloatSlider("Specular R", 1);
const inSpecularG = op.inFloatSlider("Specular G", 1);
const inSpecularB = op.inFloatSlider("Specular B", 1);
inSpecularR.setUiAttribs({ "colorPick": true });
const colorSpecularIn = [inSpecularR, inSpecularG, inSpecularB];
op.setPortGroup("Specular Color", colorSpecularIn);

const inConeAngle = op.inFloat("Cone Angle", 120);
const inConeAngleInner = op.inFloat("Inner Cone Angle", 60);
const inSpotExponent = op.inFloat("Spot Exponent", 0.97);
const coneAttribsIn = [inConeAngle, inConeAngleInner, inSpotExponent];
op.setPortGroup("Cone Attributes", coneAttribsIn);

const inFalloff = op.inFloatSlider("Falloff", 0.00001);
const lightAttribsIn = [inCastLight, inIntensity, inRadius];
op.setPortGroup("Light Attributes", lightAttribsIn);

const inCastShadow = op.inBool("Cast Shadow", false);
const inRenderMapActive = op.inBool("Rendering Active", true);
const inMapSize = op.inSwitch("Map Size", [256, 512, 1024, 2048], 512);
const inShadowStrength = op.inFloatSlider("Shadow Strength", 0.99);
const inNear = op.inFloat("Near", 0.1);
const inFar = op.inFloat("Far", 30);
const inBias = op.inFloatSlider("Bias", 0.0001);
const inPolygonOffset = op.inInt("Polygon Offset", 0);
const inNormalOffset = op.inFloatSlider("Normal Offset", 0);
const inBlur = op.inFloatSlider("Blur Amount", 0);
op.setPortGroup("", [inCastShadow]);
op.setPortGroup("Shadow Map Settings", [
    inMapSize,
    inRenderMapActive,
    inShadowStrength,
    inNear,
    inFar,
    inBias,
    inPolygonOffset,
    inNormalOffset,
    inBlur
]);

inMapSize.setUiAttribs({ "greyout": true, "hidePort": true });
inRenderMapActive.setUiAttribs({ "greyout": true });
inShadowStrength.setUiAttribs({ "greyout": true });
inNear.setUiAttribs({ "greyout": true, "hidePort": true });
inFar.setUiAttribs({ "greyout": true, "hidePort": true });
inBlur.setUiAttribs({ "greyout": true, "hidePort": true });
inPolygonOffset.setUiAttribs({ "greyout": true, "hidePort": true });
inNormalOffset.setUiAttribs({ "greyout": true, "hidePort": true });
inBias.setUiAttribs({ "greyout": true, "hidePort": true });

const inAdvanced = op.inBool("Enable Advanced", false);
const inMSAA = op.inSwitch("MSAA", ["none", "2x", "4x", "8x"], "none");
const inFilterType = op.inSwitch("Texture Filter", ["Linear", "Nearest", "Mip Map"], "Linear");
const inAnisotropic = op.inSwitch("Anisotropic", [0, 1, 2, 4, 8, 16], "0");
inMSAA.setUiAttribs({ "greyout": true, "hidePort": true });
inFilterType.setUiAttribs({ "greyout": true, "hidePort": true });
inAnisotropic.setUiAttribs({ "greyout": true, "hidePort": true });
op.setPortGroup("Advanced Options", [inAdvanced, inMSAA, inFilterType, inAnisotropic]);

let updating = false;

inAdvanced.setUiAttribs({ "hidePort": true });

inAdvanced.onChange = function ()
{
    inMSAA.setUiAttribs({ "greyout": !inAdvanced.get() });
    inFilterType.setUiAttribs({ "greyout": !inAdvanced.get() });
    inAnisotropic.setUiAttribs({ "greyout": !inAdvanced.get() });
};

const outTrigger = op.outTrigger("Trigger Out");
const outTexture = op.outTexture("Shadow Map");
const outWorldPosX = op.outNumber("World Position X");
const outWorldPosY = op.outNumber("World Position Y");
const outWorldPosZ = op.outNumber("World Position Z");

const newLight = new CGL.Light(cgl, {
    "type": "spot",
    "position": [0, 1, 2].map(function (i) { return positionIn[i].get(); }),
    "color": [0, 1, 2].map(function (i) { return colorIn[i].get(); }),
    "specular": [0, 1, 2].map(function (i) { return colorSpecularIn[i].get(); }),
    "conePointAt": [0, 1, 2].map(function (i) { return pointAtIn[i].get(); }),
    "intensity": inIntensity.get(),
    "radius": inRadius.get(),
    "falloff": inFalloff.get(),
    "cosConeAngleInner": Math.cos(CGL.DEG2RAD * inConeAngleInner.get()),
    "cosConeAngle": Math.cos(CGL.DEG2RAD * inConeAngle.get()),
    "spotExponent": inSpotExponent.get(),
    "castShadow": false,
    "shadowStrength": inShadowStrength.get(),
    "shadowBias": inBias.get(),
    "normalOffset": inNormalOffset.get(),
});
newLight.castLight = inCastLight.get();

let updateLight = false;
inR.onChange = inG.onChange = inB.onChange = inSpecularR.onChange = inSpecularG.onChange = inSpecularB.onChange
= inPointAtX.onChange = inPointAtY.onChange = inPointAtZ.onChange = inPosX.onChange = inPosY.onChange = inPosZ.onChange;
inCastLight.onChange = inIntensity.onChange = inRadius.onChange = inFalloff.onChange = inConeAngle.onChange = inConeAngleInner.onChange
= inSpotExponent.onChange = inShadowStrength.onChange = inNear.onChange = inFar.onChange = updateLightParameters;

function updateLightParameters()
{
    updateLight = true;
}

inCastShadow.onChange = function ()
{
    updating = true;
    const castShadow = inCastShadow.get();

    inMapSize.setUiAttribs({ "greyout": !castShadow });
    inRenderMapActive.setUiAttribs({ "greyout": !castShadow });
    inShadowStrength.setUiAttribs({ "greyout": !castShadow });
    inNear.setUiAttribs({ "greyout": !castShadow });
    inFar.setUiAttribs({ "greyout": !castShadow });
    inNormalOffset.setUiAttribs({ "greyout": !castShadow });
    inBlur.setUiAttribs({ "greyout": !castShadow });
    inBias.setUiAttribs({ "greyout": !castShadow });
    inPolygonOffset.setUiAttribs({ "greyout": !castShadow });

    updateLight = true;
};

let texelSize = 1 / Number(inMapSize.get());

function updateBuffers()
{
    const MSAA = Number(inMSAA.get().charAt(0));

    let filterType = null;
    const anisotropyFactor = Number(inAnisotropic.get());

    if (inFilterType.get() == "Linear")
    {
        filterType = CGL.Texture.FILTER_LINEAR;
    }
    else if (inFilterType.get() == "Nearest")
    {
        filterType = CGL.Texture.FILTER_NEAREST;
    }
    else if (inFilterType.get() == "Mip Map")
    {
        filterType = CGL.Texture.FILTER_MIPMAP;
    }

    const mapSize = Number(inMapSize.get());
    const textureOptions = {
        "isFloatingPointTexture": true,
        "filter": filterType,
    };

    if (MSAA) Object.assign(textureOptions, { "multisampling": true, "multisamplingSamples": MSAA });
    Object.assign(textureOptions, { "anisotropic": anisotropyFactor });

    newLight.createFramebuffer(mapSize, mapSize, textureOptions);
    newLight.createBlurEffect(textureOptions);
}

inMSAA.onChange = inAnisotropic.onChange = inFilterType.onChange = inMapSize.onChange = function ()
{
    updating = true;
};

function updateShadowMapFramebuffer()
{
    const size = Number(inMapSize.get());
    texelSize = 1 / size;

    if (inCastShadow.get())
    {
        newLight.createFramebuffer(Number(inMapSize.get()), Number(inMapSize.get()), {});
        newLight.createShadowMapShader();
        newLight.createBlurEffect({});
        newLight.createBlurShader();
        newLight.updateProjectionMatrix(null, inNear.get(), inFar.get(), inConeAngle.get());
    }

    if (inAdvanced.get()) updateBuffers();

    updating = false;
}

const position = vec3.create();
const pointAtPos = vec3.create();
const resultPos = vec3.create();
const resultPointAt = vec3.create();

function drawHelpers()
{
    if (cgl.frameStore.shadowPass) return;
    if (cgl.shouldDrawHelpers(op))
    {
        gui.setTransformGizmo({
            "posX": inPosX,
            "posY": inPosY,
            "posZ": inPosZ,
        });

        CABLES.GL_MARKER.drawLineSourceDest({
            op,
            "sourceX": newLight.position[0],
            "sourceY": newLight.position[1],
            "sourceZ": newLight.position[2],
            "destX": newLight.conePointAt[0],
            "destY": newLight.conePointAt[1],
            "destZ": newLight.conePointAt[2],
        });
    }
}

let errorActive = false;
inTrigger.onTriggered = renderLight;

op.preRender = () =>
{
    updateShadowMapFramebuffer();
    renderLight();
};

function renderLight()
{
    if (updating)
    {
        if (cgl.frameStore.shadowPass) return;
        updateShadowMapFramebuffer();
    }

    if (!cgl.frameStore.shadowPass)
    {
        if (!newLight.isUsed && !errorActive)
        {
            op.setUiError("lightUsed", "No operator is using this light. Make sure this op is positioned before an operator that uses lights. Also make sure there is an operator that uses lights after this.", 1); // newLight.isUsed = false;
            errorActive = true;
        }
        else if (!newLight.isUsed && errorActive) {}
        else if (newLight.isUsed && errorActive)
        {
            op.setUiError("lightUsed", null);
            errorActive = false;
        }
        else if (newLight.isUsed && !errorActive) {}
        newLight.isUsed = false;
    }

    if (updateLight)
    {
        newLight.position = [0, 1, 2].map(function (i) { return positionIn[i].get(); });
        newLight.color = [0, 1, 2].map(function (i) { return colorIn[i].get(); });
        newLight.specular = [0, 1, 2].map(function (i) { return colorSpecularIn[i].get(); });
        newLight.conePointAt = [0, 1, 2].map(function (i) { return pointAtIn[i].get(); });
        newLight.intensity = inIntensity.get();
        newLight.castLight = inCastLight.get();
        newLight.radius = inRadius.get();
        newLight.falloff = inFalloff.get();
        newLight.cosConeAngleInner = Math.cos(CGL.DEG2RAD * inConeAngleInner.get());
        newLight.cosConeAngle = Math.cos(CGL.DEG2RAD * inConeAngle.get());
        newLight.spotExponent = inSpotExponent.get();
        newLight.castShadow = inCastShadow.get();
        newLight.updateProjectionMatrix(null, inNear.get(), inFar.get(), inConeAngle.get());
    }

    if (!cgl.frameStore.lightStack) cgl.frameStore.lightStack = [];

    vec3.set(position, inPosX.get(), inPosY.get(), inPosZ.get());
    vec3.set(pointAtPos, inPointAtX.get(), inPointAtY.get(), inPointAtZ.get());

    vec3.transformMat4(resultPos, position, cgl.mMatrix);
    vec3.transformMat4(resultPointAt, pointAtPos, cgl.mMatrix);

    newLight.position = resultPos;
    newLight.conePointAt = resultPointAt;

    outWorldPosX.set(newLight.position[0]);
    outWorldPosY.set(newLight.position[1]);
    outWorldPosZ.set(newLight.position[2]);

    if (!cgl.frameStore.shadowPass) drawHelpers();

    cgl.frameStore.lightStack.push(newLight);

    if (inCastShadow.get())
    {
        const blurAmount = 1.5 * inBlur.get() * texelSize;
        if (inRenderMapActive.get()) newLight.renderPasses(inPolygonOffset.get(), blurAmount, function () { outTrigger.trigger(); });
        outTexture.set(null);
        outTexture.set(newLight.getShadowMapDepth());

        // remove light from stack and readd it with shadow map & mvp matrix
        cgl.frameStore.lightStack.pop();

        newLight.castShadow = inCastShadow.get();
        newLight.blurAmount = inBlur.get();
        newLight.normalOffset = inNormalOffset.get();
        newLight.shadowBias = inBias.get();
        newLight.shadowStrength = inShadowStrength.get();
        cgl.frameStore.lightStack.push(newLight);
    }

    outTrigger.trigger();

    cgl.frameStore.lightStack.pop();
}


};

Ops.Gl.Phong.SpotLight_v5.prototype = new CABLES.Op();
CABLES.OPS["76418c17-abd5-401b-82e2-688db6f966ee"]={f:Ops.Gl.Phong.SpotLight_v5,objName:"Ops.Gl.Phong.SpotLight_v5"};




// **************************************************************
// 
// Ops.Gl.Meshes.Cube_v2
// 
// **************************************************************

Ops.Gl.Meshes.Cube_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    render = op.inTrigger("Render"),
    active = op.inValueBool("Render Mesh", true),
    width = op.inValue("Width", 1),
    len = op.inValue("Length", 1),
    height = op.inValue("Height", 1),
    center = op.inValueBool("Center", true),
    mapping = op.inSwitch("Mapping", ["Side", "Cube +-"], "Side"),
    mappingBias = op.inValue("Bias", 0),
    inFlipX = op.inValueBool("Flip X", true),
    sideTop = op.inValueBool("Top", true),
    sideBottom = op.inValueBool("Bottom", true),
    sideLeft = op.inValueBool("Left", true),
    sideRight = op.inValueBool("Right", true),
    sideFront = op.inValueBool("Front", true),
    sideBack = op.inValueBool("Back", true),
    trigger = op.outTrigger("Next"),
    geomOut = op.outObject("geometry", null, "geometry");

const cgl = op.patch.cgl;
op.toWorkPortsNeedToBeLinked(render);

op.setPortGroup("Mapping", [mapping, mappingBias, inFlipX]);
op.setPortGroup("Geometry", [width, height, len, center]);
op.setPortGroup("Sides", [sideTop, sideBottom, sideLeft, sideRight, sideFront, sideBack]);

let geom = null,
    mesh = null,
    meshvalid = true,
    needsRebuild = true;

mappingBias.onChange =
    inFlipX.onChange =
    sideTop.onChange =
    sideBottom.onChange =
    sideLeft.onChange =
    sideRight.onChange =
    sideFront.onChange =
    sideBack.onChange =
    mapping.onChange =
    width.onChange =
    height.onChange =
    len.onChange =
    center.onChange = buildMeshLater;

function buildMeshLater()
{
    needsRebuild = true;
}

render.onLinkChanged = function ()
{
    if (!render.isLinked())
    {
        geomOut.set(null);
        return;
    }
    buildMesh();
};

render.onTriggered = function ()
{
    if (needsRebuild)buildMesh();
    if (active.get() && mesh && meshvalid) mesh.render(cgl.getShader());
    trigger.trigger();
};

op.preRender = function ()
{
    buildMesh();
    mesh.render(cgl.getShader());
};

function buildMesh()
{
    if (!geom)geom = new CGL.Geometry("cubemesh");
    geom.clear();

    let x = width.get();
    let nx = -1 * width.get();
    let y = height.get();
    let ny = -1 * height.get();
    let z = len.get();
    let nz = -1 * len.get();

    if (!center.get())
    {
        nx = 0;
        ny = 0;
        nz = 0;
    }
    else
    {
        x *= 0.5;
        nx *= 0.5;
        y *= 0.5;
        ny *= 0.5;
        z *= 0.5;
        nz *= 0.5;
    }

    if (mapping.get() == "Side") sideMappedCube(geom, x, y, z, nx, ny, nz);
    else cubeMappedCube(geom, x, y, z, nx, ny, nz);

    geom.verticesIndices = [];
    if (sideTop.get()) geom.verticesIndices.push(8, 9, 10, 8, 10, 11); // Top face
    if (sideBottom.get()) geom.verticesIndices.push(12, 13, 14, 12, 14, 15); // Bottom face
    if (sideLeft.get()) geom.verticesIndices.push(20, 21, 22, 20, 22, 23); // Left face
    if (sideRight.get()) geom.verticesIndices.push(16, 17, 18, 16, 18, 19); // Right face
    if (sideBack.get()) geom.verticesIndices.push(4, 5, 6, 4, 6, 7); // Back face
    if (sideFront.get()) geom.verticesIndices.push(0, 1, 2, 0, 2, 3); // Front face

    if (geom.verticesIndices.length === 0) meshvalid = false;
    else meshvalid = true;

    if (mesh)mesh.dispose();
    mesh = new CGL.Mesh(cgl, geom);
    geomOut.set(null);
    geomOut.set(geom);

    needsRebuild = false;
}

op.onDelete = function ()
{
    if (mesh)mesh.dispose();
};

function sideMappedCube(geom, x, y, z, nx, ny, nz)
{
    geom.vertices = [
        // Front face
        nx, ny, z,
        x, ny, z,
        x, y, z,
        nx, y, z,
        // Back face
        nx, ny, nz,
        nx, y, nz,
        x, y, nz,
        x, ny, nz,
        // Top face
        nx, y, nz,
        nx, y, z,
        x, y, z,
        x, y, nz,
        // Bottom face
        nx, ny, nz,
        x, ny, nz,
        x, ny, z,
        nx, ny, z,
        // Right face
        x, ny, nz,
        x, y, nz,
        x, y, z,
        x, ny, z,
        // zeft face
        nx, ny, nz,
        nx, ny, z,
        nx, y, z,
        nx, y, nz
    ];

    const bias = mappingBias.get();

    let fone = 1.0;
    let fzero = 0.0;
    if (inFlipX.get())
    {
        fone = 0.0;
        fzero = 1.0;
    }

    geom.setTexCoords([
        // Front face
        fzero + bias, 1 - bias,
        fone - bias, 1 - bias,
        fone - bias, 0 + bias,
        fzero + bias, 0 + bias,
        // Back face
        fone - bias, 1 - bias,
        fone - bias, 0 + bias,
        fzero + bias, 0 + bias,
        fzero + bias, 1 - bias,
        // Top face
        fzero + bias, 0 + bias,
        fzero + bias, 1 - bias,
        fone - bias, 1 - bias,
        fone - bias, 0 + bias,
        // Bottom face
        fone - bias, 0 + bias,
        fzero + bias, 0 + bias,
        fzero + bias, 1 - bias,
        fone - bias, 1 - bias,
        // Right face
        fone - bias, 1 - bias,
        fone - bias, 0 + bias,
        fzero + bias, 0 + bias,
        fzero + bias, 1 - bias,
        // Left face
        fzero + bias, 1 - bias,
        fone - bias, 1 - bias,
        fone - bias, 0 + bias,
        fzero + bias, 0 + bias,
    ]);

    geom.vertexNormals = new Float32Array([
        // Front face
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,

        // Back face
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,

        // Top face
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,

        // Bottom face
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,

        // Right face
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,

        // Left face
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0
    ]);
    geom.tangents = new Float32Array([

        // front face
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        // back face
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // top face
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // bottom face
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        // right face
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // left face
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1
    ]);
    geom.biTangents = new Float32Array([
        // front face
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        // back face
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // top face
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // bottom face
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // right face
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // left face
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0
    ]);
}

function cubeMappedCube(geom, x, y, z, nx, ny, nz)
{
    geom.vertices = [
        // Front face
        nx, ny, z,
        x, ny, z,
        x, y, z,
        nx, y, z,
        // Back face
        nx, ny, nz,
        nx, y, nz,
        x, y, nz,
        x, ny, nz,
        // Top face
        nx, y, nz,
        nx, y, z,
        x, y, z,
        x, y, nz,
        // Bottom face
        nx, ny, nz,
        x, ny, nz,
        x, ny, z,
        nx, ny, z,
        // Right face
        x, ny, nz,
        x, y, nz,
        x, y, z,
        x, ny, z,
        // zeft face
        nx, ny, nz,
        nx, ny, z,
        nx, y, z,
        nx, y, nz
    ];

    const sx = 0.25;
    const sy = 1 / 3;
    const bias = mappingBias.get();

    let flipx = 0.0;
    if (inFlipX.get()) flipx = 1.0;

    const tc = [];
    tc.push(
        // Front face   Z+
        flipx + sx + bias, sy * 2 - bias,
        flipx + sx * 2 - bias, sy * 2 - bias,
        flipx + sx * 2 - bias, sy + bias,
        flipx + sx + bias, sy + bias,
        // Back face Z-
        flipx + sx * 4 - bias, sy * 2 - bias,
        flipx + sx * 4 - bias, sy + bias,
        flipx + sx * 3 + bias, sy + bias,
        flipx + sx * 3 + bias, sy * 2 - bias);

    if (inFlipX.get())
        tc.push(
            // Top face
            sx + bias, 0 - bias,
            sx * 2 - bias, 0 - bias,
            sx * 2 - bias, sy * 1 + bias,
            sx + bias, sy * 1 + bias,
            // Bottom face
            sx + bias, sy * 3 + bias,
            sx + bias, sy * 2 - bias,
            sx * 2 - bias, sy * 2 - bias,
            sx * 2 - bias, sy * 3 + bias
        );

    else
        tc.push(
            // Top face
            sx + bias, 0 + bias,
            sx + bias, sy * 1 - bias,
            sx * 2 - bias, sy * 1 - bias,
            sx * 2 - bias, 0 + bias,
            // Bottom face
            sx + bias, sy * 3 - bias,
            sx * 2 - bias, sy * 3 - bias,
            sx * 2 - bias, sy * 2 + bias,
            sx + bias, sy * 2 + bias);

    tc.push(
        // Right face
        flipx + sx * 3 - bias, 1.0 - sy - bias,
        flipx + sx * 3 - bias, 1.0 - sy * 2 + bias,
        flipx + sx * 2 + bias, 1.0 - sy * 2 + bias,
        flipx + sx * 2 + bias, 1.0 - sy - bias,
        // Left face
        flipx + sx * 0 + bias, 1.0 - sy - bias,
        flipx + sx * 1 - bias, 1.0 - sy - bias,
        flipx + sx * 1 - bias, 1.0 - sy * 2 + bias,
        flipx + sx * 0 + bias, 1.0 - sy * 2 + bias);

    geom.setTexCoords(tc);

    geom.vertexNormals = [
        // Front face
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,

        // Back face
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,

        // Top face
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,

        // Bottom face
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,

        // Right face
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,

        // Left face
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0
    ];
    geom.tangents = new Float32Array([
        // front face
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        // back face
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // top face
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // bottom face
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        // right face
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // left face
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1
    ]);
    geom.biTangents = new Float32Array([
        // front face
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        // back face
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // top face
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // bottom face
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // right face
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // left face
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0
    ]);
}


};

Ops.Gl.Meshes.Cube_v2.prototype = new CABLES.Op();
CABLES.OPS["37b92ba4-cea5-42ae-bf28-a513ca28549c"]={f:Ops.Gl.Meshes.Cube_v2,objName:"Ops.Gl.Meshes.Cube_v2"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.ZoomBlur
// 
// **************************************************************

Ops.Gl.TextureEffects.ZoomBlur = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={zoomblur_frag:"UNI sampler2D tex;\nUNI float x;\nUNI float y;\nUNI float strength;\n// UNI vec2 texSize;\nIN vec2 texCoord;\n\n#ifdef HAS_MASK\n    UNI sampler2D texMask;\n#endif\n\n\nfloat random(vec3 scale, float seed) {\n    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\n}\n\n\nvoid main()\n{\n    vec4 color = vec4(0.0);\n    float total = 0.0;\n    vec2 center=vec2(x,1.0-y);\n\n    vec2 texSize=vec2(1.0,1.0);\n\n    vec2 toCenter = center - texCoord * texSize;\n\n    /* randomize the lookup values to hide the fixed number of samples */\n    float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\n\n    float am=strength;\n\n    #ifdef HAS_MASK\n        am=am*texture(texMask,texCoord).r;\n        if(am<=0.02)\n        {\n            outColor=texture(tex, texCoord);\n            return;\n        }\n    #endif\n\n\n\n\n    for (float t = 0.0; t <= 40.0; t++) {\n        float percent = (t + offset) / 40.0;\n        float weight = 4.0 * (percent - percent * percent);\n        vec4 smpl = texture(tex, texCoord + toCenter * percent * am / texSize);\n\n        /* switch to pre-multiplied alpha to correctly blur transparent images */\n        smpl.rgb *= smpl.a;\n\n        color += smpl * weight;\n        total += weight;\n    }\n\n    outColor = color / total;\n    // outColor.r=1.0;\n\n    /* switch back from pre-multiplied alpha */\n    // outColor.rgb /= outColor.a + 0.00001;\n}",};
var render=op.inTrigger('render');
var strength=op.inValueSlider("strength",0.5);
var x=op.inValue("X",0.5);
var y=op.inValue("Y",0.5);

var mask=op.inTexture("mask");

mask.onChange=function()
{
    if(mask.get() && mask.get().tex) shader.define('HAS_MASK');
        else shader.removeDefine('HAS_MASK');
};

var trigger=op.outTrigger('trigger');

var cgl=op.patch.cgl;
var shader=new CGL.Shader(cgl,'zoomblur');

var srcFrag=attachments.zoomblur_frag;

shader.setSource(shader.getDefaultVertexShader(),srcFrag );
var textureUniform=new CGL.Uniform(shader,'t','tex',0);
var textureMask=new CGL.Uniform(shader,'t','texMask',1);

var uniX=new CGL.Uniform(shader,'f','x',x);
var uniY=new CGL.Uniform(shader,'f','y',y);
var strengthUniform=new CGL.Uniform(shader,'f','strength',strength);

render.onTriggered=function()
{
    if(!CGL.TextureEffect.checkOpInEffect(op)) return;

    if(strength.get()>0)
    {
        cgl.pushShader(shader);
        cgl.currentTextureEffect.bind();

        cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex );


        if(mask.get() && mask.get().tex)
        {
            cgl.setTexture(1, mask.get().tex );
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, mask.get().tex );
        }


        cgl.currentTextureEffect.finish();
        cgl.popShader();
    }
    trigger.trigger();
};


};

Ops.Gl.TextureEffects.ZoomBlur.prototype = new CABLES.Op();
CABLES.OPS["b60f01fc-6ea6-4720-ae33-e3d9208e99f9"]={f:Ops.Gl.TextureEffects.ZoomBlur,objName:"Ops.Gl.TextureEffects.ZoomBlur"};




// **************************************************************
// 
// Ops.Patch.LoadingStatus_v2
// 
// **************************************************************

Ops.Patch.LoadingStatus_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe = op.addInPort(new CABLES.Port(op, "exe", CABLES.OP_PORT_TYPE_FUNCTION)),
    preRenderOps = op.inValueBool("PreRender Ops"),
    startTimeLine = op.inBool("Play Timeline", true),

    next = op.outTrigger("Next"),
    outInitialFinished = op.outBool("Finished Initial Loading", false),
    outLoading = op.outBool("Loading"),
    outProgress = op.outNumber("Progress"),
    outList = op.outArray("Jobs"),
    loadingFinished = op.outTrigger("Trigger Loading Finished ");

const cgl = op.patch.cgl;
const patch = op.patch;

let finishedOnce = false;
const preRenderTimes = [];
let firstTime = true;

document.body.classList.add("cables-loading");

let loadingId = cgl.patch.loading.start("loadingStatusInit", "loadingStatusInit");

exe.onTriggered = () =>
{
    const jobs = op.patch.loading.getListJobs();
    outProgress.set(patch.loading.getProgress());

    let hasFinished = jobs.length === 0;
    const notFinished = !hasFinished;
    // outLoading.set(!hasFinished);

    if (notFinished)
    {
        outList.set(op.patch.loading.getListJobs());
    }

    if (notFinished)
    {
        if (firstTime)
        {
            if (preRenderOps.get()) op.patch.preRenderOps();
            op.patch.timer.setTime(0);
            if (startTimeLine.get())
            {
                op.patch.timer.play();
            }
        }
        firstTime = false;

        document.body.classList.remove("cables-loading");
        document.body.classList.add("cables-loaded");
    }
    else
    {
        finishedOnce = true;
        outList.set(op.patch.loading.getListJobs());

        if (patch.loading.getProgress() < 1.0)
        {
            op.patch.timer.setTime(0);
            op.patch.timer.pause();
        }
    }

    outInitialFinished.set(finishedOnce);

    if (outLoading.get() && hasFinished) loadingFinished.trigger();

    outLoading.set(notFinished);

    next.trigger();

    if (loadingId)
    {
        cgl.patch.loading.finished(loadingId);
        loadingId = null;
    }
};


};

Ops.Patch.LoadingStatus_v2.prototype = new CABLES.Op();
CABLES.OPS["e62f7f4c-7436-437e-8451-6bc3c28545f7"]={f:Ops.Patch.LoadingStatus_v2,objName:"Ops.Patch.LoadingStatus_v2"};




// **************************************************************
// 
// Ops.Gl.ForceCanvasSize
// 
// **************************************************************

Ops.Gl.ForceCanvasSize = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inTrigger = op.inTrigger("Trigger"),
    inActive = op.inBool("Active", true),
    inWhat = op.inSwitch("Force", ["Resolution", "Aspect Ratio"], "Resolution"),
    inCenter = op.inBool("Center In Parent", true),
    inScaleFit = op.inBool("Scale to fit Parent", false),
    inWidth = op.inInt("Set Width", 300),
    inHeight = op.inInt("Set Height", 200),
    inPresets = op.inDropDown("Aspect Ratio", ["Custom", "21:9", "2:1", "16:9", "16:10", "4:3", "1:1", "9:16", "1:2", "iPhoneXr Vert"], "16:9"),
    inRatio = op.inFloat("Ratio", 0),
    inStretch = op.inDropDown("Fill Parent", ["Auto", "Width", "Height", "Both"], "Auto"),
    next = op.outTrigger("Next"),
    outWidth = op.outNumber("Width"),
    outHeight = op.outNumber("Height"),
    outMarginLeft = op.outNumber("Margin Left"),
    outMarginTop = op.outNumber("Margin Top");

op.setPortGroup("Size", [inWidth, inHeight]);
op.setPortGroup("Proportions", [inRatio, inStretch, inPresets]);

let align = 0;
const ALIGN_NONE = 0;
const ALIGN_WIDTH = 1;
const ALIGN_HEIGHT = 2;
const ALIGN_BOTH = 3;
const ALIGN_AUTO = 4;

inStretch.onChange = updateUi;
inWhat.onChange = updateMethod;
inCenter.onChange =
    inTrigger.onLinkChanged = removeStyles;

inPresets.onChange = updateRatioPreset;

const cgl = op.patch.cgl;

updateUi();

function updateMethod()
{
    if (inWhat.get() == "Aspect Ratio")
    {
        inRatio.set(100);
        updateRatioPreset();
    }
    updateUi();
}

function updateRatioPreset()
{
    const pr = inPresets.get();
    if (pr == "Custom") return;
    else if (pr == "16:9")inRatio.set(16 / 9);
    else if (pr == "4:3")inRatio.set(4 / 3);
    else if (pr == "16:10")inRatio.set(16 / 10);
    else if (pr == "21:9")inRatio.set(21 / 9);
    else if (pr == "2:1")inRatio.set(2);
    else if (pr == "1:1")inRatio.set(1);
    else if (pr == "9:16")inRatio.set(9 / 16);
    else if (pr == "1:2")inRatio.set(0.5);
    else if (pr == "iPhoneXr Vert")inRatio.set(9 / 19.5);
}

inRatio.onChange = () =>
{
    removeStyles();
};

inActive.onChange = function ()
{
    if (!inActive.get())removeStyles();
};

function updateUi()
{
    const forceRes = inWhat.get() == "Resolution";
    inWidth.setUiAttribs({ "greyout": !forceRes });
    inHeight.setUiAttribs({ "greyout": !forceRes });

    inPresets.setUiAttribs({ "greyout": forceRes });
    inStretch.setUiAttribs({ "greyout": forceRes });
    inRatio.setUiAttribs({ "greyout": forceRes });

    align = 0;

    if (!forceRes)
    {
        const strAlign = inStretch.get();
        if (strAlign == "Width")align = ALIGN_WIDTH;
        else if (strAlign == "Height")align = ALIGN_HEIGHT;
        else if (strAlign == "Both")align = ALIGN_BOTH;
        else if (strAlign == "Auto")align = ALIGN_AUTO;
    }
}

function removeStyles()
{
    cgl.canvas.style["margin-top"] = "";
    cgl.canvas.style["margin-left"] = "";

    outMarginLeft.set(0);
    outMarginTop.set(0);

    const rect = cgl.canvas.parentNode.getBoundingClientRect();
    cgl.setSize(rect.width, rect.height);
}

inTrigger.onTriggered = function ()
{
    if (!inActive.get()) return next.trigger();

    let w = inWidth.get();
    let h = inHeight.get();

    let clientRect = cgl.canvas.parentNode.getBoundingClientRect();
    if (clientRect.height == 0)
    {
        cgl.canvas.parentNode.style.height = "100%";
        clientRect = cgl.canvas.parentNode.getBoundingClientRect();
    }
    if (clientRect.width == 0)
    {
        cgl.canvas.parentNode.style.width = "100%";
        clientRect = cgl.canvas.parentNode.getBoundingClientRect();
    }

    if (align == ALIGN_WIDTH)
    {
        w = clientRect.width;
        h = w * 1 / inRatio.get();
    }
    else if (align == ALIGN_HEIGHT)
    {
        h = clientRect.height;
        w = h * inRatio.get();
    }
    else if (align == ALIGN_AUTO)
    {
        const rect = clientRect;

        h = rect.height;
        w = h * inRatio.get();

        if (w > rect.width)
        {
            w = rect.width;
            h = w * 1 / inRatio.get();
        }
    }
    else if (align == ALIGN_BOTH)
    {
        const rect = clientRect;
        h = rect.height;
        w = h * inRatio.get();

        if (w < rect.width)
        {
            w = rect.width;
            h = w * 1 / inRatio.get();
        }
    }

    w = Math.ceil(w);
    h = Math.ceil(h);

    if (inCenter.get())
    {
        const rect = clientRect;

        const t = (rect.height - h) / 2;
        const l = (rect.width - w) / 2;

        outMarginLeft.set(l);
        outMarginTop.set(t);

        cgl.canvas.style["margin-top"] = t + "px";
        cgl.canvas.style["margin-left"] = l + "px";
    }
    else
    {
        cgl.canvas.style["margin-top"] = "0";
        cgl.canvas.style["margin-left"] = "0";

        outMarginLeft.set(0);
        outMarginTop.set(0);
    }

    if (inScaleFit.get())
    {
        const rect = clientRect;
        const scX = rect.width / inWidth.get();
        const scY = rect.height / inHeight.get();
        cgl.canvas.style.transform = "scale(" + Math.min(scX, scY) + ")";
    }
    else
    {
        cgl.canvas.style.transform = "scale(1)";
    }

    if (cgl.canvas.width / cgl.pixelDensity != w || cgl.canvas.height / cgl.pixelDensity != h)
    {
        outWidth.set(w);
        outHeight.set(h);
        cgl.setSize(w, h);
    }
    // else
    next.trigger();
};


};

Ops.Gl.ForceCanvasSize.prototype = new CABLES.Op();
CABLES.OPS["a8b3380e-cd4a-4000-9ee9-1c65a11027dd"]={f:Ops.Gl.ForceCanvasSize,objName:"Ops.Gl.ForceCanvasSize"};




// **************************************************************
// 
// Ops.TimeLine.TimeLineControls
// 
// **************************************************************

Ops.TimeLine.TimeLineControls = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
var plauPause=op.outValue("Play/Stop");
var time=op.outValue("time");

op.patch.timer.onPlayPause(seek);
op.patch.timer.onTimeChange(seek);

function seek()
{
    plauPause.set(false);

    setTimeout(function()
    {
        time.set(op.patch.timer.getTime());
        plauPause.set(op.patch.timer.isPlaying());
    },10);
}

};

Ops.TimeLine.TimeLineControls.prototype = new CABLES.Op();
CABLES.OPS["53cb7b1a-56c7-405f-b427-12db78fbfd2f"]={f:Ops.TimeLine.TimeLineControls,objName:"Ops.TimeLine.TimeLineControls"};




// **************************************************************
// 
// Ops.TimeLine.TimeLineTime
// 
// **************************************************************

Ops.TimeLine.TimeLineTime = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};

const theTime=op.outValue("time");

op.onAnimFrame=function(time)
{
    theTime.set(time);
};


};

Ops.TimeLine.TimeLineTime.prototype = new CABLES.Op();
CABLES.OPS["3ab26f26-a12a-4c48-9411-20591a5f569d"]={f:Ops.TimeLine.TimeLineTime,objName:"Ops.TimeLine.TimeLineTime"};




// **************************************************************
// 
// Ops.Vars.VarSetNumber_v2
// 
// **************************************************************

Ops.Vars.VarSetNumber_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const val = op.inValueFloat("Value", 0);
op.varName = op.inDropDown("Variable", [], "", true);

new CABLES.VarSetOpWrapper(op, "number", val, op.varName);


};

Ops.Vars.VarSetNumber_v2.prototype = new CABLES.Op();
CABLES.OPS["b5249226-6095-4828-8a1c-080654e192fa"]={f:Ops.Vars.VarSetNumber_v2,objName:"Ops.Vars.VarSetNumber_v2"};




// **************************************************************
// 
// Ops.Gl.Matrix.Camera
// 
// **************************************************************

Ops.Gl.Matrix.Camera = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const render = op.inTrigger("render");
const trigger = op.outTrigger("trigger");

/* Inputs */
// projection | prespective & ortogonal
const projectionMode = op.inValueSelect("projection mode", ["prespective", "ortogonal"], "prespective");
const zNear = op.inValue("frustum near", 0.01);
const zFar = op.inValue("frustum far", 5000.0);

const fov = op.inValue("fov", 45);
const autoAspect = op.inValueBool("Auto Aspect Ratio", true);
const aspect = op.inValue("Aspect Ratio", 1);

// look at camera
const eyeX = op.inValue("eye X", 0);
const eyeY = op.inValue("eye Y", 0);
const eyeZ = op.inValue("eye Z", 5);

const centerX = op.inValue("center X", 0);
const centerY = op.inValue("center Y", 0);
const centerZ = op.inValue("center Z", 0);

// camera transform and movements
const posX = op.inValue("truck", 0);
const posY = op.inValue("boom", 0);
const posZ = op.inValue("dolly", 0);

const rotX = op.inValue("tilt", 0);
const rotY = op.inValue("pan", 0);
const rotZ = op.inValue("roll", 0);

/* Outputs */
const outAsp = op.outValue("Aspect");
const outArr = op.outArray("Look At Array");

/* logic */
const cgl = op.patch.cgl;

let asp = 0;

const vUp = vec3.create();
const vEye = vec3.create();
const vCenter = vec3.create();
const transMatrix = mat4.create();
mat4.identity(transMatrix);

const arr = [];

// Transform and move
const vPos = vec3.create();
const transMatrixMove = mat4.create();
mat4.identity(transMatrixMove);

let updateCameraMovementMatrix = true;

render.onTriggered = function ()
{
    if (cgl.frameStore.shadowPass) return trigger.trigger();

    // Aspect ration
    if (!autoAspect.get()) asp = aspect.get();
    else asp = cgl.getViewPort()[2] / cgl.getViewPort()[3];
    outAsp.set(asp);

    // translation (truck, boom, dolly)
    cgl.pushViewMatrix();

    if (updateCameraMovementMatrix)
    {
        mat4.identity(transMatrixMove);

        vec3.set(vPos, posX.get(), posY.get(), posZ.get());
        if (posX.get() !== 0.0 || posY.get() !== 0.0 || posZ.get() !== 0.0)
            mat4.translate(transMatrixMove, transMatrixMove, vPos);

        if (rotX.get() !== 0)
            mat4.rotateX(transMatrixMove, transMatrixMove, rotX.get() * CGL.DEG2RAD);
        if (rotY.get() !== 0)
            mat4.rotateY(transMatrixMove, transMatrixMove, rotY.get() * CGL.DEG2RAD);
        if (rotZ.get() !== 0)
            mat4.rotateZ(transMatrixMove, transMatrixMove, rotZ.get() * CGL.DEG2RAD);

        updateCameraMovementMatrix = false;
    }

    mat4.multiply(cgl.vMatrix, cgl.vMatrix, transMatrixMove);

    // projection (prespective / ortogonal)
    cgl.pushPMatrix();

    // look at
    cgl.pushViewMatrix();

    if (projectionMode.get() == "prespective")
    {
        mat4.perspective(
            cgl.pMatrix,
            fov.get() * 0.0174533,
            asp,
            zNear.get(),
            zFar.get()
        );
    }
    else if (projectionMode.get() == "ortogonal")
    {
        mat4.ortho(
            cgl.pMatrix,
            -1 * (fov.get() / 14),
            1 * (fov.get() / 14),
            -1 * (fov.get() / 14) / asp,
            1 * (fov.get() / 14) / asp,
            zNear.get(),
            zFar.get()
        );
    }

    arr[0] = eyeX.get();
    arr[1] = eyeY.get();
    arr[2] = eyeZ.get();

    arr[3] = centerX.get();
    arr[4] = centerY.get();
    arr[5] = centerZ.get();

    arr[6] = 0;
    arr[7] = 1;
    arr[8] = 0;

    outArr.set(null);
    outArr.set(arr);

    vec3.set(vUp, 0, 1, 0);
    vec3.set(vEye, eyeX.get(), eyeY.get(), eyeZ.get());
    vec3.set(vCenter, centerX.get(), centerY.get(), centerZ.get());

    mat4.lookAt(transMatrix, vEye, vCenter, vUp);

    mat4.multiply(cgl.vMatrix, cgl.vMatrix, transMatrix);

    trigger.trigger();

    cgl.popViewMatrix();
    cgl.popPMatrix();

    cgl.popViewMatrix();

    // GUI for dolly, boom and truck
    if (op.isCurrentUiOp())
        gui.setTransformGizmo({
            "posX": posX,
            "posY": posY,
            "posZ": posZ
        });
};

const updateUI = function ()
{
    if (!autoAspect.get())
    {
        aspect.setUiAttribs({ "hidePort": false, "greyout": false });
    }
    else
    {
        aspect.setUiAttribs({ "hidePort": true, "greyout": true });
    }
};

const cameraMovementChanged = function ()
{
    updateCameraMovementMatrix = true;
};

// listeners
posX.onChange = cameraMovementChanged;
posY.onChange = cameraMovementChanged;
posZ.onChange = cameraMovementChanged;

rotX.onChange = cameraMovementChanged;
rotY.onChange = cameraMovementChanged;
rotZ.onChange = cameraMovementChanged;

autoAspect.onChange = updateUI;
updateUI();


};

Ops.Gl.Matrix.Camera.prototype = new CABLES.Op();
CABLES.OPS["b24dbfdc-485c-49d2-92a1-7258efd9239a"]={f:Ops.Gl.Matrix.Camera,objName:"Ops.Gl.Matrix.Camera"};




// **************************************************************
// 
// Ops.Gl.ClearColor
// 
// **************************************************************

Ops.Gl.ClearColor = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    render = op.inTrigger("render"),
    trigger = op.outTrigger("trigger"),
    r = op.inFloatSlider("r", 0.1),
    g = op.inFloatSlider("g", 0.1),
    b = op.inFloatSlider("b", 0.1),
    a = op.inFloatSlider("a", 1);

r.setUiAttribs({ "colorPick": true });

const cgl = op.patch.cgl;

render.onTriggered = function ()
{
    cgl.gl.clearColor(r.get(), g.get(), b.get(), a.get());
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    trigger.trigger();
};


};

Ops.Gl.ClearColor.prototype = new CABLES.Op();
CABLES.OPS["19b441eb-9f63-4f35-ba08-b87841517c4d"]={f:Ops.Gl.ClearColor,objName:"Ops.Gl.ClearColor"};




// **************************************************************
// 
// Ops.Gl.Shader.CustomShader_v2
// 
// **************************************************************

Ops.Gl.Shader.CustomShader_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    render = op.inTrigger("render"),
    fragmentShader = op.inStringEditor("Fragment Code"),
    vertexShader = op.inStringEditor("Vertex Code"),
    asMaterial = op.inValueBool("Use As Material", true),
    trigger = op.outTrigger("trigger"),
    outShader = op.outObject("Shader", null, "shader"),
    outErrors = op.outBool("Has Errors");

const cgl = op.patch.cgl;
const uniformInputs = [];
const uniformTextures = [];
const vectors = [];

op.toWorkPortsNeedToBeLinked(render);

fragmentShader.setUiAttribs({ "editorSyntax": "glsl" });
vertexShader.setUiAttribs({ "editorSyntax": "glsl" });

const shader = new CGL.Shader(cgl, op.name);

shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);

op.setPortGroup("Source Code", [fragmentShader, vertexShader]);
op.setPortGroup("Options", [asMaterial]);

fragmentShader.set(CGL.Shader.getDefaultFragmentShader());
vertexShader.set(CGL.Shader.getDefaultVertexShader());

fragmentShader.onChange = vertexShader.onChange = function () { needsUpdate = true; };

render.onTriggered = doRender;

var needsUpdate = true;
op.onLoadedValueSet = initDataOnLoad;

function initDataOnLoad(data)
{
    updateShader();
    // console.log(data);
    // set uniform values AFTER shader has been compiled and uniforms are extracted and uniform ports are created.
    for (let i = 0; i < uniformInputs.length; i++)
        for (let j = 0; j < data.portsIn.length; j++)
            if (uniformInputs[i] && uniformInputs[i].name == data.portsIn[j].name)
            {
                uniformInputs[i].set(data.portsIn[j].value);
                uniformInputs[i].deSerializeSettings(data.portsIn[j]);
            }
}

op.init = function ()
{
    updateShader();
};

function doRender()
{
    setVectorValues();
    if (needsUpdate)updateShader();
    if (asMaterial.get()) cgl.pushShader(shader);
    trigger.trigger();
    if (asMaterial.get()) cgl.popShader();
}

function bindTextures()
{
    for (let i = 0; i < uniformTextures.length; i++)
        if (uniformTextures[i] && uniformTextures[i].get() && uniformTextures[i].get().tex)
            cgl.setTexture(0 + i + 3, uniformTextures[i].get().tex);
}

function hasUniformInput(name)
{
    for (let i = 0; i < uniformInputs.length; i++) if (uniformInputs[i] && uniformInputs[i].name == name) return true;
    for (let i = 0; i < uniformTextures.length; i++) if (uniformTextures[i] && uniformTextures[i].name == name) return true;
    return false;
}

const tempMat4 = mat4.create();
// var lastm4;
const uniformNameBlacklist = [
    "modelMatrix",
    "viewMatrix",
    "normalMatrix",
    "mvMatrix",
    "projMatrix",
    "inverseViewMatrix",
    "camPos"
];

let countTexture = 0;
const foundNames = [];

function parseUniforms(src)
{
    const lblines = src.split("\n");
    const groupUniforms = [];

    for (let k = 0; k < lblines.length; k++)
    {
        const lines = lblines[k].split(";");

        for (let i = 0; i < lines.length; i++)
        {
            let words = lines[i].split(" ");

            for (var j = 0; j < words.length; j++) words[j] = (words[j] + "").trim();

            if (words[0] === "UNI" || words[0] === "uniform")
            {
                let varnames = words[2];
                if (words.length > 4) for (var j = 3; j < words.length; j++)varnames += words[j];

                words = words.filter(function (el) { return el !== ""; });
                const type = words[1];

                let names = [varnames];
                if (varnames.indexOf(",") > -1) names = varnames.split(",");

                for (let l = 0; l < names.length; l++)
                {
                    if (uniformNameBlacklist.indexOf(names[l]) > -1) continue;
                    const uniName = names[l].trim();

                    if (type === "float")
                    {
                        foundNames.push(uniName);
                        if (!hasUniformInput(uniName))
                        {
                            const newInput = op.inFloat(uniName, 0);
                            newInput.uniform = new CGL.Uniform(shader, "f", uniName, newInput);
                            uniformInputs.push(newInput);
                            groupUniforms.push(newInput);
                        }
                    }
                    else if (type === "int")
                    {
                        foundNames.push(uniName);
                        if (!hasUniformInput(uniName))
                        {
                            const newInput = op.inInt(uniName, 0);
                            newInput.uniform = new CGL.Uniform(shader, "i", uniName, newInput);
                            uniformInputs.push(newInput);
                            groupUniforms.push(newInput);
                        }
                    }
                    else if (type === "bool")
                    {
                        foundNames.push(uniName);
                        if (!hasUniformInput(uniName))
                        {
                            const newInput = op.inBool(uniName, false);
                            newInput.uniform = new CGL.Uniform(shader, "b", uniName, newInput);
                            uniformInputs.push(newInput);
                            groupUniforms.push(newInput);
                        }
                    }
                    else if (type === "mat4")
                    {
                        foundNames.push(uniName);
                        if (!hasUniformInput(uniName))
                        {
                            const newInput = op.inArray(uniName, 0);
                            newInput.uniform = new CGL.Uniform(shader, "m4", uniName, newInput);
                            uniformInputs.push(newInput);
                            groupUniforms.push(newInput);

                            const vec = {
                                "name": uniName,
                                "num": 16,
                                "port": newInput,
                                "uni": newInput.uniform,
                                "changed": false
                            };
                            newInput.onChange = function () { this.changed = true; }.bind(vec);

                            vectors.push(vec);
                        }
                    }
                    else if (type === "sampler2D" || type === "samplerCube")
                    {
                        foundNames.push(uniName);
                        if (!hasUniformInput(uniName))
                        {
                            const newInputTex = op.inObject(uniName);

                            let uniType = "t";
                            if (type === "samplerCube")uniType = "tc";

                            newInputTex.uniform = new CGL.Uniform(shader, uniType, uniName, 3 + uniformTextures.length);
                            uniformTextures.push(newInputTex);
                            groupUniforms.push(newInputTex);
                            newInputTex.set(CGL.Texture.getTempTexture(cgl));
                            newInputTex.on("change", (v, p) =>
                            {
                                if (!v)p.set(CGL.Texture.getTempTexture(cgl));
                            });
                            countTexture++;
                        }
                    }
                    else if (type === "vec3" || type === "vec2" || type === "vec4")
                    {
                        let num = 2;
                        if (type === "vec4")num = 4;
                        if (type === "vec3")num = 3;
                        foundNames.push(uniName + " X");
                        foundNames.push(uniName + " Y");
                        if (num > 2)foundNames.push(uniName + " Z");
                        if (num > 3)foundNames.push(uniName + " W");

                        if (!hasUniformInput(uniName + " X"))
                        {
                            const group = [];
                            const vec = {
                                "name": uniName,
                                "num": num,
                                "changed": false,
                            };
                            vectors.push(vec);
                            initVectorUniform(vec);

                            const newInputX = op.inFloat(uniName + " X", 0);
                            newInputX.onChange = function () { this.changed = true; }.bind(vec);
                            uniformInputs.push(newInputX);
                            group.push(newInputX);
                            vec.x = newInputX;

                            const newInputY = op.inFloat(uniName + " Y", 0);
                            newInputY.onChange = function () { this.changed = true; }.bind(vec);
                            uniformInputs.push(newInputY);
                            group.push(newInputY);
                            vec.y = newInputY;

                            if (num > 2)
                            {
                                const newInputZ = op.inFloat(uniName + " Z", 0);
                                newInputZ.onChange = function () { this.changed = true; }.bind(vec);
                                uniformInputs.push(newInputZ);
                                group.push(newInputZ);
                                vec.z = newInputZ;
                            }
                            if (num > 3)
                            {
                                const newInputW = op.inFloat(uniName + " W", 0);
                                newInputW.onChange = function () { this.changed = true; }.bind(vec);
                                uniformInputs.push(newInputW);
                                group.push(newInputW);
                                vec.w = newInputW;
                            }

                            op.setPortGroup(uniName, group);
                        }
                    }
                }
            }
        }
    }
    op.setPortGroup("uniforms", groupUniforms);
}

function updateShader()
{
    if (!shader) return;

    shader.bindTextures = bindTextures.bind(this);
    shader.setSource(vertexShader.get(), fragmentShader.get());

    if (cgl.glVersion == 1)
    {
        cgl.gl.getExtension("OES_standard_derivatives");
        // cgl.gl.getExtension('OES_texture_float');
        // cgl.gl.getExtension('OES_texture_float_linear');
        // cgl.gl.getExtension('OES_texture_half_float');
        // cgl.gl.getExtension('OES_texture_half_float_linear');

        shader.enableExtension("GL_OES_standard_derivatives");
    // shader.enableExtension("GL_OES_texture_float");
    // shader.enableExtension("GL_OES_texture_float_linear");
    // shader.enableExtension("GL_OES_texture_half_float");
    // shader.enableExtension("GL_OES_texture_half_float_linear");
    }

    countTexture = 0;
    foundNames.length = 0;

    parseUniforms(vertexShader.get());
    parseUniforms(fragmentShader.get());

    for (var j = 0; j < uniformTextures.length; j++)
        for (var i = 0; i < foundNames.length; i++)
            if (uniformTextures[j] && foundNames.indexOf(uniformTextures[j].name) == -1)
            {
                uniformTextures[j].remove();
                uniformTextures[j] = null;
            }

    for (var j = 0; j < uniformInputs.length; j++)
        for (var i = 0; i < foundNames.length; i++)
            if (uniformInputs[j] && foundNames.indexOf(uniformInputs[j].name) == -1)
            {
                uniformInputs[j].remove();
                uniformInputs[j] = null;
            }

    for (var j = 0; j < vectors.length; j++)
    {
        initVectorUniform(vectors[j]);
        vectors[j].changed = true;
    }

    for (i = 0; i < uniformInputs.length; i++)
        if (uniformInputs[i] && uniformInputs[i].uniform)uniformInputs[i].uniform.needsUpdate = true;

    shader.compile();

    if (CABLES.UI) gui.opParams.show(op);

    outShader.set(null);
    outShader.set(shader);
    needsUpdate = false;

    if (shader.hasErrors()) op.setUiError("compile", "Shader has errors");
    else op.setUiError("compile", null);

    outErrors.set(shader.hasErrors());
}

function initVectorUniform(vec)
{
    if (vec.num == 2) vec.uni = new CGL.Uniform(shader, "2f", vec.name, [0, 0]);
    else if (vec.num == 3) vec.uni = new CGL.Uniform(shader, "3f", vec.name, [0, 0, 0]);
    else if (vec.num == 4) vec.uni = new CGL.Uniform(shader, "4f", vec.name, [0, 0, 0, 0]);
}

function setVectorValues()
{
    for (let i = 0; i < vectors.length; i++)
    {
        const v = vectors[i];
        if (v.changed)
        {
            if (v.num === 2) v.uni.setValue([v.x.get(), v.y.get()]);
            else if (v.num === 3) v.uni.setValue([v.x.get(), v.y.get(), v.z.get()]);
            else if (v.num === 4) v.uni.setValue([v.x.get(), v.y.get(), v.z.get(), v.w.get()]);

            else if (v.num > 4)
            {
                v.uni.setValue(v.port.get());
                // console.log(v.port.get());
            }

            v.changed = false;
        }
    }
}


};

Ops.Gl.Shader.CustomShader_v2.prototype = new CABLES.Op();
CABLES.OPS["a165fc89-a35b-4d39-8930-7345b098bd9d"]={f:Ops.Gl.Shader.CustomShader_v2,objName:"Ops.Gl.Shader.CustomShader_v2"};




// **************************************************************
// 
// Ops.Gl.Shader.Shader2Texture
// 
// **************************************************************

Ops.Gl.Shader.Shader2Texture = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exec = op.inTrigger("Render"),
    inShader = op.inObject("Shader", null, "shader"),
    inVPSize = op.inValueBool("Use Viewport Size", true),
    inWidth = op.inValueInt("Width", 512),
    inHeight = op.inValueInt("Height", 512),
    tfilter = op.inValueSelect("filter", ["nearest", "linear", "mipmap"]),
    twrap = op.inValueSelect("wrap", ["clamp to edge", "repeat", "mirrored repeat"], "clamp to edge"),
    inFloatingPoint = op.inValueBool("Floating Point", false),
    inNumTex = op.inSwitch("Num Textures", ["1", "4"], "1"),
    next = op.outTrigger("Next"),
    outTex = op.outTexture("Texture"),
    outTex2 = op.outTexture("Texture 2"),
    outTex3 = op.outTexture("Texture 3"),
    outTex4 = op.outTexture("Texture 4");

op.setPortGroup("Texture Size", [inVPSize, inWidth, inHeight]);
op.setPortGroup("Texture settings", [tfilter, twrap, inFloatingPoint]);

let numTextures = 1;
const cgl = op.patch.cgl;
const prevViewPort = [0, 0, 0, 0];
const effect = null;

let lastShader = null;
let shader = null;

inWidth.onChange =
    inHeight.onChange =
    inFloatingPoint.onChange =
    tfilter.onChange =
    inNumTex.onChange =
    twrap.onChange = initFbLater;

inVPSize.onChange = updateUI;

const showingError = false;

let fb = null;
const tex = null;
let needInit = true;

const mesh = CGL.MESHES.getSimpleRect(cgl, "shader2texture rect");

op.toWorkPortsNeedToBeLinked(inShader);

tfilter.set("nearest");

updateUI();

function warning()
{
    if (tfilter.get() == "mipmap" && inFloatingPoint.get())
    {
        op.setUiError("warning", "HDR and mipmap filtering at the same time is not possible");
    }
    else
    {
        op.setUiError("warning", null);
    }
}

function updateUI()
{
    inWidth.setUiAttribs({ "greyout": inVPSize.get() });
    inHeight.setUiAttribs({ "greyout": inVPSize.get() });

    inWidth.set(cgl.getViewPort()[2]);
    inHeight.set(cgl.getViewPort()[3]);
}

function initFbLater()
{
    needInit = true;
    warning();
}

const drawBuffArr = [];

function resetShader()
{
    if (shader) shader.dispose();
    lastShader = null;
    shader = null;
}

function initFb()
{
    needInit = false;
    if (fb)fb.delete();

    const oldLen = drawBuffArr.length;
    numTextures = parseInt(inNumTex.get());
    drawBuffArr.length = 0;
    for (let i = 0; i < numTextures; i++)drawBuffArr[i] = true;

    if (oldLen != drawBuffArr.length)
    {
        resetShader();
    }

    fb = null;

    let w = inWidth.get();
    let h = inHeight.get();

    if (inVPSize.get())
    {
        w = cgl.getViewPort()[2];
        h = cgl.getViewPort()[3];
    }

    let filter = CGL.Texture.FILTER_NEAREST;
    if (tfilter.get() == "linear") filter = CGL.Texture.FILTER_LINEAR;
    else if (tfilter.get() == "mipmap") filter = CGL.Texture.FILTER_MIPMAP;

    let selectedWrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;
    if (twrap.get() == "repeat") selectedWrap = CGL.Texture.WRAP_REPEAT;
    if (twrap.get() == "mirrored repeat") selectedWrap = CGL.Texture.WRAP_MIRRORED_REPEAT;

    if (cgl.glVersion >= 2)
    {
        fb = new CGL.Framebuffer2(cgl, w, h,
            {
                "isFloatingPointTexture": inFloatingPoint.get(),
                "multisampling": false,
                "numRenderBuffers": numTextures,
                "wrap": selectedWrap,
                "filter": filter,
                "depth": true,
                "multisamplingSamples": 0,
                "clear": true
            });
    }
    else
    {
        fb = new CGL.Framebuffer(cgl, inWidth.get(), inHeight.get(),
            {
                "isFloatingPointTexture": inFloatingPoint.get(),
                "filter": filter,
                "wrap": selectedWrap
            });
    }
}

exec.onTriggered = function ()
{
    const vp = cgl.getViewPort();

    if (!fb || needInit)initFb();
    if (inVPSize.get() && fb && (vp[2] != fb.getTextureColor().width || vp[3] != fb.getTextureColor().height)) initFb();

    if (!inShader.get() || !inShader.get().setDrawBuffers) return;

    if (inShader.get() != lastShader)
    {
        lastShader = inShader.get();
        shader = inShader.get().copy();

        shader.setDrawBuffers(drawBuffArr);
    }

    if (!shader)
    {
        outTex.set(null);
        return;
    }

    prevViewPort[0] = vp[0];
    prevViewPort[1] = vp[1];
    prevViewPort[2] = vp[2];
    prevViewPort[3] = vp[3];

    fb.renderStart(cgl);

    cgl.pushPMatrix();
    mat4.identity(cgl.pMatrix);

    cgl.pushViewMatrix();
    mat4.identity(cgl.vMatrix);

    cgl.pushModelMatrix();
    mat4.identity(cgl.mMatrix);

    cgl.pushShader(inShader.get());
    if (shader.bindTextures) shader.bindTextures();

    cgl.pushBlend(false);

    mesh.render(inShader.get());

    cgl.popBlend();

    cgl.popPMatrix();
    cgl.popModelMatrix();
    cgl.popViewMatrix();
    fb.renderEnd(cgl);

    if (numTextures >= 2)
    {
        outTex.set(fb.getTextureColorNum(0));
        outTex2.set(fb.getTextureColorNum(1));
        outTex3.set(fb.getTextureColorNum(2));
        outTex4.set(fb.getTextureColorNum(3));
    }
    else outTex.set(fb.getTextureColor());

    cgl.popShader();

    cgl.gl.viewport(prevViewPort[0], prevViewPort[1], prevViewPort[2], prevViewPort[3]);

    next.trigger();
};


};

Ops.Gl.Shader.Shader2Texture.prototype = new CABLES.Op();
CABLES.OPS["a3debb76-7d84-4548-9e7b-24891423dcce"]={f:Ops.Gl.Shader.Shader2Texture,objName:"Ops.Gl.Shader.Shader2Texture"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.Noise.Noise
// 
// **************************************************************

Ops.Gl.TextureEffects.Noise.Noise = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={noise_frag:"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI float amount;\nUNI float time;\n\n{{CGL.BLENDMODES}}\n{{MODULES_HEAD}}\n\n{{CGL.RANDOM_TEX}}\n\nvoid main()\n{\n    vec4 rnd;\n\n    #ifndef RGB\n        float r=cgl_random(texCoord.xy+vec2(time));\n        rnd=vec4( r,r,r,1.0 );\n    #endif\n\n    #ifdef RGB\n        rnd=vec4(cgl_random3(texCoord.xy+vec2(time)),1.0);\n    #endif\n\n    vec4 base=texture(tex,texCoord);\n    vec4 col=vec4( _blend(base.rgb,rnd.rgb) ,1.0);\n\n    outColor=vec4( mix( col.rgb, base.rgb ,1.0-base.a*amount),1.0);\n}",};
const
    render = op.inTrigger("Render"),
    blendMode = CGL.TextureEffect.AddBlendSelect(op, "Blend Mode", "normal"),
    amount = op.inValueSlider("Amount", 1),
    animated = op.inValueBool("Animated", true),
    inRGB = op.inValueBool("RGB", false),
    trigger = op.outTrigger("Next");

const
    cgl = op.patch.cgl,
    shader = new CGL.Shader(cgl, op.name),
    amountUniform = new CGL.Uniform(shader, "f", "amount", amount),
    timeUniform = new CGL.Uniform(shader, "f", "time", 1.0),
    textureUniform = new CGL.Uniform(shader, "t", "tex", 0);

shader.setSource(shader.getDefaultVertexShader(), attachments.noise_frag);

CGL.TextureEffect.setupBlending(op, shader, blendMode, amount);

op.toWorkPortsNeedToBeLinked(render);

inRGB.onChange = function ()
{
    if (inRGB.get())shader.define("RGB");
    else shader.removeDefine("RGB");
};

shader.bindTextures = function ()
{
    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);
};

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    if (animated.get()) timeUniform.setValue(op.patch.freeTimer.get() / 1000 % 100);
    else timeUniform.setValue(0);

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.TextureEffects.Noise.Noise.prototype = new CABLES.Op();
CABLES.OPS["81253441-cc73-42fa-b903-6d23806873d9"]={f:Ops.Gl.TextureEffects.Noise.Noise,objName:"Ops.Gl.TextureEffects.Noise.Noise"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.Vignette_v2
// 
// **************************************************************

Ops.Gl.TextureEffects.Vignette_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={vignette_frag:"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI float lensRadius1;\nUNI float aspect;\nUNI float amount;\nUNI float strength;\nUNI float sharp;\n\nUNI float r,g,b;\n\n{{CGL.BLENDMODES}}\n\nvoid main()\n{\n    vec4 vcol=vec4(r,g,b,1.0);\n    vec4 col=texture(tex,texCoord);\n    vec2 tcPos=vec2(texCoord.x,(texCoord.y-0.5)*aspect+0.5);\n    float dist = distance(tcPos, vec2(0.5,0.5));\n    float am = (1.0-smoothstep( (lensRadius1+0.5), (lensRadius1*0.99+0.5)*sharp, dist));\n\n    col=mix(col,vcol,am*strength);\n    vec4 base=texture(tex,texCoord);\n\n\n    outColor=cgl_blend(base,col,amount);\n\n\n\n}\n",};
const
     render=op.inTrigger("Render"),
     blendMode=CGL.TextureEffect.AddBlendSelect(op,"Blend Mode","normal"),
     amount=op.inValueSlider("Amount",1),
     trigger=op.outTrigger("Trigger"),
     strength=op.inValueSlider("Strength",1),
     lensRadius1=op.inValueSlider("Radius",0.3),
     sharp=op.inValueSlider("Sharp",0.25),
     aspect=op.inValue("Aspect",1),
     r = op.inValueSlider("r", 0),
     g = op.inValueSlider("g", 0),
     b = op.inValueSlider("b", 0);

r.setUiAttribs({ colorPick: true });

const cgl=op.patch.cgl;
const shader=new CGL.Shader(cgl,'vignette');

shader.setSource(shader.getDefaultVertexShader(),attachments.vignette_frag);

const
    textureUniform=new CGL.Uniform(shader,'t','tex',0),
    amountUniform=new CGL.Uniform(shader,'f','amount',amount),
    uniLensRadius1=new CGL.Uniform(shader,'f','lensRadius1',lensRadius1),
    uniaspect=new CGL.Uniform(shader,'f','aspect',aspect),
    unistrength=new CGL.Uniform(shader,'f','strength',strength),
    unisharp=new CGL.Uniform(shader,'f','sharp',sharp),
    unir=new CGL.Uniform(shader,'f','r',r),
    unig=new CGL.Uniform(shader,'f','g',g),
    unib=new CGL.Uniform(shader,'f','b',b);

CGL.TextureEffect.setupBlending(op,shader,blendMode,amount);

render.onTriggered=function()
{
    if(!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex );

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.TextureEffects.Vignette_v2.prototype = new CABLES.Op();
CABLES.OPS["ee274501-ac60-49ab-a854-80aa38c36f76"]={f:Ops.Gl.TextureEffects.Vignette_v2,objName:"Ops.Gl.TextureEffects.Vignette_v2"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.Color
// 
// **************************************************************

Ops.Gl.TextureEffects.Color = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={color_frag:"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI float r;\nUNI float g;\nUNI float b;\nUNI float amount;\n\n#ifdef MASK\n    UNI sampler2D mask;\n#endif\n\n{{CGL.BLENDMODES}}\n\nvoid main()\n{\n    vec4 col=vec4(r,g,b,1.0);\n    vec4 base=texture(tex,texCoord);\n\n    float am=amount;\n    #ifdef MASK\n        float msk=texture(mask,texCoord).r;\n        #ifdef INVERTMASK\n            msk=1.0-msk;\n        #endif\n        am*=1.0-msk;\n    #endif\n\n    outColor= cgl_blend(base,col,am);\n    outColor.a*=base.a;\n\n}\n",};
const
    render = op.inTrigger("render"),
    blendMode = CGL.TextureEffect.AddBlendSelect(op, "Blend Mode", "normal"),
    amount = op.inValueSlider("Amount", 1),
    inMask = op.inTexture("Mask"),
    inMaskInvert = op.inValueBool("Mask Invert"),
    r = op.inValueSlider("r", Math.random()),
    g = op.inValueSlider("g", Math.random()),
    b = op.inValueSlider("b", Math.random()),
    trigger = op.outTrigger("trigger");

r.setUiAttribs({ "colorPick": true });
op.setPortGroup("Color", [r, g, b]);

const TEX_SLOT = 0;
const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "textureeffect color");
const srcFrag = attachments.color_frag || "";
shader.setSource(shader.getDefaultVertexShader(), srcFrag);
CGL.TextureEffect.setupBlending(op, shader, blendMode, amount);

const
    textureUniform = new CGL.Uniform(shader, "t", "tex", TEX_SLOT),
    makstextureUniform = new CGL.Uniform(shader, "t", "mask", 1),
    uniformR = new CGL.Uniform(shader, "f", "r", r),
    uniformG = new CGL.Uniform(shader, "f", "g", g),
    uniformB = new CGL.Uniform(shader, "f", "b", b),
    uniformAmount = new CGL.Uniform(shader, "f", "amount", amount);

inMask.onChange = function ()
{
    if (inMask.get())shader.define("MASK");
    else shader.removeDefine("MASK");
};

inMaskInvert.onChange = function ()
{
    if (inMaskInvert.get())shader.define("INVERTMASK");
    else shader.removeDefine("INVERTMASK");
};

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(TEX_SLOT, cgl.currentTextureEffect.getCurrentSourceTexture().tex);
    if (inMask.get()) cgl.setTexture(1, inMask.get().tex);

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.TextureEffects.Color.prototype = new CABLES.Op();
CABLES.OPS["c0acfc80-16f9-4f17-978d-bad650f3ed1c"]={f:Ops.Gl.TextureEffects.Color,objName:"Ops.Gl.TextureEffects.Color"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.Blur
// 
// **************************************************************

Ops.Gl.TextureEffects.Blur = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={blur_frag:"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI float dirX;\nUNI float dirY;\nUNI float amount;\n\n#ifdef HAS_MASK\n    UNI sampler2D imageMask;\n#endif\n\nfloat random(vec3 scale, float seed)\n{\n    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\n}\n\nvoid main()\n{\n    vec4 color = vec4(0.0);\n    float total = 0.0;\n\n    float am=amount;\n    #ifdef HAS_MASK\n        am=amount*texture(imageMask,texCoord).r;\n        if(am<=0.02)\n        {\n            outColor=texture(tex, texCoord);\n            return;\n        }\n    #endif\n\n    vec2 delta=vec2(dirX*am*0.01,dirY*am*0.01);\n\n\n    float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\n\n    #ifdef MOBILE\n        offset = 0.1;\n    #endif\n\n    #if defined(FASTBLUR) && !defined(MOBILE)\n        const float range=5.0;\n    #else\n        const float range=20.0;\n    #endif\n\n    for (float t = -range; t <= range; t+=1.0)\n    {\n        float percent = (t + offset - 0.5) / range;\n        float weight = 1.0 - abs(percent);\n        vec4 smpl = texture(tex, texCoord + delta * percent);\n\n        smpl.rgb *= smpl.a;\n\n        color += smpl * weight;\n        total += weight;\n    }\n\n    outColor= color / total;\n\n    outColor.rgb /= outColor.a + 0.00001;\n\n\n\n}\n",};
const render = op.inTrigger("render");
const trigger = op.outTrigger("trigger");
const amount = op.inValueFloat("amount");
const direction = op.inSwitch("direction", ["both", "vertical", "horizontal"], "both");
const fast = op.inValueBool("Fast", true);
const cgl = op.patch.cgl;

amount.set(10);

let shader = new CGL.Shader(cgl, "blur");

shader.define("FASTBLUR");

fast.onChange = function ()
{
    if (fast.get()) shader.define("FASTBLUR");
    else shader.removeDefine("FASTBLUR");
};

shader.setSource(shader.getDefaultVertexShader(), attachments.blur_frag);
let textureUniform = new CGL.Uniform(shader, "t", "tex", 0);

let uniDirX = new CGL.Uniform(shader, "f", "dirX", 0);
let uniDirY = new CGL.Uniform(shader, "f", "dirY", 0);

let uniWidth = new CGL.Uniform(shader, "f", "width", 0);
let uniHeight = new CGL.Uniform(shader, "f", "height", 0);

let uniAmount = new CGL.Uniform(shader, "f", "amount", amount.get());
amount.onChange = function () { uniAmount.setValue(amount.get()); };

let textureAlpha = new CGL.Uniform(shader, "t", "imageMask", 1);

let showingError = false;

function fullScreenBlurWarning()
{
    if (cgl.currentTextureEffect.getCurrentSourceTexture().width == cgl.canvasWidth &&
        cgl.currentTextureEffect.getCurrentSourceTexture().height == cgl.canvasHeight)
    {
        op.setUiError("warning", "Full screen blurs are slow! Try reducing the resolution to 1/2 or a 1/4", 0);
    }
    else
    {
        op.setUiError("warning", null);
    }
}

let dir = 0;
direction.onChange = function ()
{
    if (direction.get() == "both")dir = 0;
    if (direction.get() == "horizontal")dir = 1;
    if (direction.get() == "vertical")dir = 2;
};

let mask = op.inTexture("mask");

mask.onChange = function ()
{
    if (mask.get() && mask.get().tex) shader.define("HAS_MASK");
    else shader.removeDefine("HAS_MASK");
};

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);

    uniWidth.setValue(cgl.currentTextureEffect.getCurrentSourceTexture().width);
    uniHeight.setValue(cgl.currentTextureEffect.getCurrentSourceTexture().height);

    fullScreenBlurWarning();

    // first pass
    if (dir === 0 || dir == 2)
    {
        cgl.currentTextureEffect.bind();
        cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

        if (mask.get() && mask.get().tex)
        {
            cgl.setTexture(1, mask.get().tex);
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, mask.get().tex );
        }

        uniDirX.setValue(0.0);
        uniDirY.setValue(1.0);

        cgl.currentTextureEffect.finish();
    }

    // second pass
    if (dir === 0 || dir == 1)
    {
        cgl.currentTextureEffect.bind();
        cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

        if (mask.get() && mask.get().tex)
        {
            cgl.setTexture(1, mask.get().tex);
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, mask.get().tex );
        }

        uniDirX.setValue(1.0);
        uniDirY.setValue(0.0);

        cgl.currentTextureEffect.finish();
    }

    cgl.popShader();
    trigger.trigger();
};


};

Ops.Gl.TextureEffects.Blur.prototype = new CABLES.Op();
CABLES.OPS["54f26f53-f637-44c1-9bfb-a2f2b722e998"]={f:Ops.Gl.TextureEffects.Blur,objName:"Ops.Gl.TextureEffects.Blur"};




// **************************************************************
// 
// Ops.Trigger.TriggerSend
// 
// **************************************************************

Ops.Trigger.TriggerSend = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const trigger = op.inTriggerButton("Trigger");
op.varName = op.inValueSelect("Named Trigger", [], "", true);

op.varName.onChange = updateName;

trigger.onTriggered = doTrigger;

op.patch.addEventListener("namedTriggersChanged", updateVarNamesDropdown);

updateVarNamesDropdown();

function updateVarNamesDropdown()
{
    if (CABLES.UI)
    {
        const varnames = [];
        const vars = op.patch.namedTriggers;
        varnames.push("+ create new one");
        for (const i in vars) varnames.push(i);
        op.varName.uiAttribs.values = varnames;
    }
}

function updateName()
{
    if (CABLES.UI)
    {
        if (op.varName.get() == "+ create new one")
        {
            new CABLES.UI.ModalDialog({
                "prompt": true,
                "title": "New Trigger",
                "text": "enter a name for the new trigger",
                "promptValue": "",
                "promptOk": (str) =>
                {
                    op.varName.set(str);
                    op.patch.namedTriggers[str] = op.patch.namedTriggers[str] || [];
                    updateVarNamesDropdown();
                }
            });
            return;
        }

        if (op.isCurrentUiOp()) gui.opParams.show(op);
    }

    if (!op.patch.namedTriggers[op.varName.get()])
    {
        op.patch.namedTriggers[op.varName.get()] = op.patch.namedTriggers[op.varName.get()] || [];
        op.patch.emitEvent("namedTriggersChanged");
    }

    op.setTitle(">" + op.varName.get());

    if (op.isCurrentUiOp()) gui.opParams.show(op);
}

function doTrigger()
{
    const arr = op.patch.namedTriggers[op.varName.get()];
    // fire an event even if noone is receiving this trigger
    // this way TriggerReceiveFilter can still handle it
    op.patch.emitEvent("namedTriggerSent", op.varName.get());

    if (!arr)
    {
        op.setUiError("unknowntrigger", "unknown trigger");
        op.logError("unknown trigger array!", op.varName.get());

        return;
    }
    else op.setUiError("unknowntrigger", null);

    for (let i = 0; i < arr.length; i++)
    {
        arr[i]();
    }
}


};

Ops.Trigger.TriggerSend.prototype = new CABLES.Op();
CABLES.OPS["ce1eaf2b-943b-4dc0-ab5e-ee11b63c9ed0"]={f:Ops.Trigger.TriggerSend,objName:"Ops.Trigger.TriggerSend"};




// **************************************************************
// 
// Ops.Trigger.TriggerReceive
// 
// **************************************************************

Ops.Trigger.TriggerReceive = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const next = op.outTrigger("Triggered");
op.varName = op.inValueSelect("Named Trigger", [], "", true);

updateVarNamesDropdown();
op.patch.addEventListener("namedTriggersChanged", updateVarNamesDropdown);

let oldName = null;

function doTrigger()
{
    next.trigger();
}

function updateVarNamesDropdown()
{
    if (CABLES.UI)
    {
        let varnames = [];
        let vars = op.patch.namedTriggers;
        // varnames.push('+ create new one');
        for (let i in vars) varnames.push(i);
        op.varName.uiAttribs.values = varnames;
    }
}

op.varName.onChange = function ()
{
    if (oldName)
    {
        let oldCbs = op.patch.namedTriggers[oldName];
        let a = oldCbs.indexOf(doTrigger);
        if (a != -1) oldCbs.splice(a, 1);
    }

    op.setTitle(">" + op.varName.get());
    op.patch.namedTriggers[op.varName.get()] = op.patch.namedTriggers[op.varName.get()] || [];
    let cbs = op.patch.namedTriggers[op.varName.get()];

    cbs.push(doTrigger);
    oldName = op.varName.get();
    updateError();
};

op.on("uiParamPanel", updateError);

function updateError()
{
    if (!op.varName.get())
    {
        op.setUiError("unknowntrigger", "unknown trigger");
    }
    else op.setUiError("unknowntrigger", null);
}


};

Ops.Trigger.TriggerReceive.prototype = new CABLES.Op();
CABLES.OPS["0816c999-f2db-466b-9777-2814573574c5"]={f:Ops.Trigger.TriggerReceive,objName:"Ops.Trigger.TriggerReceive"};




// **************************************************************
// 
// Ops.Trigger.TriggerOnce
// 
// **************************************************************

Ops.Trigger.TriggerOnce = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe=op.inTriggerButton("Exec"),
    reset=op.inTriggerButton("Reset"),
    next=op.outTrigger("Next");
var outTriggered=op.outValue("Was Triggered");

var triggered=false;

op.toWorkPortsNeedToBeLinked(exe);

reset.onTriggered=function()
{
    triggered=false;
    outTriggered.set(triggered);
};

exe.onTriggered=function()
{
    if(triggered)return;

    triggered=true;
    next.trigger();
    outTriggered.set(triggered);

};

};

Ops.Trigger.TriggerOnce.prototype = new CABLES.Op();
CABLES.OPS["cf3544e4-e392-432b-89fd-fcfb5c974388"]={f:Ops.Trigger.TriggerOnce,objName:"Ops.Trigger.TriggerOnce"};




// **************************************************************
// 
// Ops.Gl.Meshes.Rectangle
// 
// **************************************************************

Ops.Gl.Meshes.Rectangle = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
var render=op.inTrigger("render");
var trigger=op.outTrigger('trigger');

var width=op.inValue("width",1);
var height=op.inValue("height",1);

var pivotX=op.inSwitch("pivot x",["left","center","right"]);
var pivotY=op.inSwitch("pivot y",["top","center","bottom"]);

var nColumns=op.inValueInt("num columns",1);
var nRows=op.inValueInt("num rows",1);
var axis=op.inSwitch("axis",["xy","xz"],"xy");

var active=op.inValueBool('Active',true);

var geomOut=op.outObject("geometry");
geomOut.ignoreValueSerialize=true;

var cgl=op.patch.cgl;
axis.set('xy');
pivotX.set('center');
pivotY.set('center');

op.setPortGroup('Pivot',[pivotX,pivotY]);
op.setPortGroup('Size',[width,height]);
op.setPortGroup('Structure',[nColumns,nRows]);

var geom=new CGL.Geometry('rectangle');
var mesh=null;
var needsRebuild=false;

axis.onChange=
    pivotX.onChange=
    pivotY.onChange=
    width.onChange=
    height.onChange=
    nRows.onChange=
    nColumns.onChange=rebuildLater;
rebuild();

function rebuildLater()
{
    rebuild();
    // needsRebuild=true;
}

op.preRender=
render.onTriggered=function()
{
    if(!CGL.TextureEffect.checkOpNotInTextureEffect(op)) return;

    if(needsRebuild)rebuild();


    if(active.get() && mesh) mesh.render(cgl.getShader());
    trigger.trigger();
};

function rebuild()
{
    var w=width.get();
    var h=parseFloat(height.get());
    var x=0;
    var y=0;

    if(typeof w=='string')w=parseFloat(w);
    if(typeof h=='string')h=parseFloat(h);

    if(pivotX.get()=='center') x=0;
    else if(pivotX.get()=='right') x=-w/2;
    else if(pivotX.get()=='left') x=+w/2;

    if(pivotY.get()=='center') y=0;
    else if(pivotY.get()=='top') y=-h/2;
    else if(pivotY.get()=='bottom') y=+h/2;

    var verts=[];
    var tc=[];
    var norms=[];
    var tangents=[];
    var biTangents=[];
    var indices=[];

    var numRows=Math.round(nRows.get());
    var numColumns=Math.round(nColumns.get());

    var stepColumn=w/numColumns;
    var stepRow=h/numRows;

    var c,r,a;
    a=axis.get();
    for(r=0;r<=numRows;r++)
    {
        for(c=0;c<=numColumns;c++)
        {
            verts.push( c*stepColumn - width.get()/2+x );
            if(a=='xz') verts.push( 0.0 );
            verts.push( r*stepRow - height.get()/2+y );
            if(a=='xy') verts.push( 0.0 );

            tc.push( c/numColumns );
            tc.push( 1.0-r/numRows );

            if(a=='xz')
            {
                norms.push(0,1,0);
                tangents.push(1,0,0);
                biTangents.push(0,0,1);
            }
            else if(a=='xy')
            {
                norms.push(0,0,1);
                tangents.push(-1,0,0);
                biTangents.push(0,-1,0);
            }
        }
    }

    for(c=0;c<numColumns;c++)
    {
        for(r=0;r<numRows;r++)
        {
            var ind = c+(numColumns+1)*r;
            var v1=ind;
            var v2=ind+1;
            var v3=ind+numColumns+1;
            var v4=ind+1+numColumns+1;

            indices.push(v1);
            indices.push(v3);
            indices.push(v2);

            indices.push(v2);
            indices.push(v3);
            indices.push(v4);
        }
    }

    geom.clear();
    geom.vertices=verts;
    geom.texCoords=tc;
    geom.verticesIndices=indices;
    geom.vertexNormals=norms;
    geom.tangents=tangents;
    geom.biTangents=biTangents;

    if(numColumns*numRows>64000)geom.unIndex();

    if(!mesh) mesh=new CGL.Mesh(cgl,geom);
        else mesh.setGeom(geom);

    geomOut.set(null);
    geomOut.set(geom);
    needsRebuild=false;

}

op.onDelete=function()
{
    if(mesh)mesh.dispose();
}

};

Ops.Gl.Meshes.Rectangle.prototype = new CABLES.Op();
CABLES.OPS["20f3c4e7-04d1-44e0-b868-05756d1c66c6"]={f:Ops.Gl.Meshes.Rectangle,objName:"Ops.Gl.Meshes.Rectangle"};




// **************************************************************
// 
// Ops.Gl.Shader.BasicMaterial_v2
// 
// **************************************************************

Ops.Gl.Shader.BasicMaterial_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={basicmaterial_frag:"{{MODULES_HEAD}}\n\nIN vec2 texCoord;\nUNI vec4 color;\n// UNI float r;\n// UNI float g;\n// UNI float b;\n// UNI float a;\n\n#ifdef HAS_TEXTURES\n    IN vec2 texCoordOrig;\n    #ifdef HAS_TEXTURE_DIFFUSE\n        UNI sampler2D tex;\n    #endif\n    #ifdef HAS_TEXTURE_OPACITY\n        UNI sampler2D texOpacity;\n   #endif\n#endif\n\nvoid main()\n{\n    {{MODULE_BEGIN_FRAG}}\n    vec4 col=color;\n\n    #ifdef HAS_TEXTURES\n        // vec2 uv=vec2(texCoord.s,1.0-texCoord.t);\n        vec2 uv=texCoord;\n\n        #ifdef HAS_TEXTURE_DIFFUSE\n            col=texture(tex,uv);\n\n            #ifdef COLORIZE_TEXTURE\n                col.r*=color.r;\n                col.g*=color.g;\n                col.b*=color.b;\n            #endif\n        #endif\n        col.a*=color.a;\n        #ifdef HAS_TEXTURE_OPACITY\n            #ifdef TRANSFORMALPHATEXCOORDS\n                // uv=vec2(texCoordOrig.s,1.0-texCoordOrig.t);\n                uv=texCoordOrig;\n            #endif\n            #ifdef ALPHA_MASK_ALPHA\n                col.a*=texture(texOpacity,uv).a;\n            #endif\n            #ifdef ALPHA_MASK_LUMI\n                col.a*=dot(vec3(0.2126,0.7152,0.0722), texture(texOpacity,uv).rgb);\n            #endif\n            #ifdef ALPHA_MASK_R\n                col.a*=texture(texOpacity,uv).r;\n            #endif\n            #ifdef ALPHA_MASK_G\n                col.a*=texture(texOpacity,uv).g;\n            #endif\n            #ifdef ALPHA_MASK_B\n                col.a*=texture(texOpacity,uv).b;\n            #endif\n            // #endif\n        #endif\n    #endif\n\n    {{MODULE_COLOR}}\n\n    #ifdef DISCARDTRANS\n        if(col.a<0.2) discard;\n    #endif\n\n    outColor = col;\n}\n",basicmaterial_vert:"IN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN vec3 attrVertNormal;\nIN float attrVertIndex;\n\n{{MODULES_HEAD}}\n\nOUT vec3 norm;\nOUT vec2 texCoord;\nOUT vec2 texCoordOrig;\n\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\n\n#ifdef HAS_TEXTURES\n    UNI float diffuseRepeatX;\n    UNI float diffuseRepeatY;\n    UNI float texOffsetX;\n    UNI float texOffsetY;\n#endif\n\nvoid main()\n{\n    mat4 mMatrix=modelMatrix;\n    mat4 mvMatrix;\n\n    norm=attrVertNormal;\n    texCoordOrig=vec2(attrTexCoord.x,1.0-attrTexCoord.y);\n    texCoord=vec2(attrTexCoord.x,1.0-attrTexCoord.y);\n    #ifdef HAS_TEXTURES\n        texCoord.x=texCoord.x*diffuseRepeatX+texOffsetX;\n        texCoord.y=texCoord.y*diffuseRepeatY+texOffsetY;\n    #endif\n\n    vec4 pos = vec4(vPosition, 1.0);\n\n    #ifdef BILLBOARD\n       vec3 position=vPosition;\n       mvMatrix=viewMatrix*modelMatrix;\n\n       gl_Position = projMatrix * mvMatrix * vec4((\n           position.x * vec3(\n               mvMatrix[0][0],\n               mvMatrix[1][0],\n               mvMatrix[2][0] ) +\n           position.y * vec3(\n               mvMatrix[0][1],\n               mvMatrix[1][1],\n               mvMatrix[2][1]) ), 1.0);\n    #endif\n\n    {{MODULE_VERTEX_POSITION}}\n\n    #ifndef BILLBOARD\n        mvMatrix=viewMatrix * mMatrix;\n    #endif\n\n\n    #ifndef BILLBOARD\n        // gl_Position = projMatrix * viewMatrix * modelMatrix * pos;\n        gl_Position = projMatrix * mvMatrix * pos;\n    #endif\n}\n",};
const render=op.inTrigger("render");
const trigger=op.outTrigger('trigger');
const shaderOut=op.outObject("shader");
shaderOut.ignoreValueSerialize=true;

const cgl=op.patch.cgl;

op.toWorkPortsNeedToBeLinked(render);

const shader=new CGL.Shader(cgl,"basicmaterialnew");
shader.setModules(['MODULE_VERTEX_POSITION','MODULE_COLOR','MODULE_BEGIN_FRAG']);
// shader.bindTextures=bindTextures;
shader.setSource(attachments.basicmaterial_vert,attachments.basicmaterial_frag);
shaderOut.set(shader);

render.onTriggered=doRender;

// function bindTextures()
// {
//     // if(diffuseTexture.get()) cgl.setTexture(0, diffuseTexture.get().tex);
//     // if(textureOpacity.get()) cgl.setTexture(1, textureOpacity.get().tex);
// }

op.preRender=function()
{
    shader.bind();
    doRender();
};

function doRender()
{
    if(!shader)return;

    cgl.pushShader(shader);
    // shader.bindTextures();
    shader.popTextures();

    if(diffuseTextureUniform && diffuseTexture.get()) shader.pushTexture(diffuseTextureUniform,diffuseTexture.get().tex);
    if(textureOpacityUniform && textureOpacity.get()) shader.pushTexture(textureOpacityUniform,textureOpacity.get().tex);
    trigger.trigger();


    cgl.popShader();
}

// rgba colors
const r=op.inValueSlider("r",Math.random());
const g=op.inValueSlider("g",Math.random());
const b=op.inValueSlider("b",Math.random());
const a=op.inValueSlider("a",1);
r.setUiAttribs({"colorPick":true});

const uniColor=new CGL.Uniform(shader,'4f','color',r,g,b,a);

op.setPortGroup("Color",[r,g,b,a]);

// diffuse outTexture

var diffuseTexture=op.inTexture("texture");
var diffuseTextureUniform=null;
// shader.bindTextures=bindTextures;

diffuseTexture.onChange=updateDiffuseTexture;

function updateDiffuseTexture()
{
    if(diffuseTexture.get())
    {
        if(!shader.hasDefine('HAS_TEXTURE_DIFFUSE'))shader.define('HAS_TEXTURE_DIFFUSE');
        if(!diffuseTextureUniform)diffuseTextureUniform=new CGL.Uniform(shader,'t','texDiffuse',0);

        diffuseRepeatX.setUiAttribs({greyout:false});
        diffuseRepeatY.setUiAttribs({greyout:false});
        diffuseOffsetX.setUiAttribs({greyout:false});
        diffuseOffsetY.setUiAttribs({greyout:false});
        colorizeTexture.setUiAttribs({greyout:false});
    }
    else
    {
        shader.removeUniform('texDiffuse');
        shader.removeDefine('HAS_TEXTURE_DIFFUSE');
        diffuseTextureUniform=null;

        diffuseRepeatX.setUiAttribs({greyout:true});
        diffuseRepeatY.setUiAttribs({greyout:true});
        diffuseOffsetX.setUiAttribs({greyout:true});
        diffuseOffsetY.setUiAttribs({greyout:true});
        colorizeTexture.setUiAttribs({greyout:true});
    }
}

const colorizeTexture=op.inValueBool("colorizeTexture",false);

op.setPortGroup("Color Texture",[diffuseTexture,colorizeTexture]);

// opacity texture
var textureOpacity=op.inTexture("textureOpacity");
var textureOpacityUniform=null;

op.alphaMaskSource=op.inSwitch("Alpha Mask Source",["Luminance","R","G","B","A"],"Luminance");
op.alphaMaskSource.onChange=updateAlphaMaskMethod;
op.alphaMaskSource.setUiAttribs({greyout:true});

function updateAlphaMaskMethod()
{
    if(op.alphaMaskSource.get()=='A') shader.define('ALPHA_MASK_ALPHA');
        else shader.removeDefine('ALPHA_MASK_ALPHA');

    if(op.alphaMaskSource.get()=='Luminance') shader.define('ALPHA_MASK_LUMI');
        else shader.removeDefine('ALPHA_MASK_LUMI');

    if(op.alphaMaskSource.get()=='R') shader.define('ALPHA_MASK_R');
        else shader.removeDefine('ALPHA_MASK_R');

    if(op.alphaMaskSource.get()=='G') shader.define("ALPHA_MASK_G");
        else shader.removeDefine('ALPHA_MASK_G');

    if(op.alphaMaskSource.get()=='B') shader.define('ALPHA_MASK_B');
        else shader.removeDefine('ALPHA_MASK_B');
}

textureOpacity.onChange=updateOpacity;
function updateOpacity()
{

    if(textureOpacity.get())
    {
        if(textureOpacityUniform!==null)return;
        shader.removeUniform('texOpacity');
        shader.define('HAS_TEXTURE_OPACITY');
        if(!textureOpacityUniform)textureOpacityUniform=new CGL.Uniform(shader,'t','texOpacity',1);

        op.alphaMaskSource.setUiAttribs({greyout:false});
        discardTransPxl.setUiAttribs({greyout:false});
        texCoordAlpha.setUiAttribs({greyout:false});

    }
    else
    {
        shader.removeUniform('texOpacity');
        shader.removeDefine('HAS_TEXTURE_OPACITY');
        textureOpacityUniform=null;

        op.alphaMaskSource.setUiAttribs({greyout:true});
        discardTransPxl.setUiAttribs({greyout:true});
        texCoordAlpha.setUiAttribs({greyout:true});
    }
    updateAlphaMaskMethod();
};


var texCoordAlpha=op.inValueBool("Opacity TexCoords Transform",false);
const discardTransPxl=op.inValueBool("Discard Transparent Pixels");

discardTransPxl.onChange=function()
{
    if(discardTransPxl.get()) shader.define('DISCARDTRANS');
        else shader.removeDefine('DISCARDTRANS');
};


texCoordAlpha.onChange=function()
{
    if(texCoordAlpha.get()) shader.define('TRANSFORMALPHATEXCOORDS');
        else shader.removeDefine('TRANSFORMALPHATEXCOORDS');
};

op.setPortGroup("Opacity",[textureOpacity,op.alphaMaskSource,discardTransPxl,texCoordAlpha]);


colorizeTexture.onChange=function()
{
    if(colorizeTexture.get()) shader.define('COLORIZE_TEXTURE');
        else shader.removeDefine('COLORIZE_TEXTURE');
};




// texture coords

const diffuseRepeatX=op.inValue("diffuseRepeatX",1);
const diffuseRepeatY=op.inValue("diffuseRepeatY",1);
const diffuseOffsetX=op.inValue("Tex Offset X",0);
const diffuseOffsetY=op.inValue("Tex Offset Y",0);

const diffuseRepeatXUniform=new CGL.Uniform(shader,'f','diffuseRepeatX',diffuseRepeatX);
const diffuseRepeatYUniform=new CGL.Uniform(shader,'f','diffuseRepeatY',diffuseRepeatY);
const diffuseOffsetXUniform=new CGL.Uniform(shader,'f','texOffsetX',diffuseOffsetX);
const diffuseOffsetYUniform=new CGL.Uniform(shader,'f','texOffsetY',diffuseOffsetY);

op.setPortGroup("Texture Transform",[diffuseRepeatX,diffuseRepeatY,diffuseOffsetX,diffuseOffsetY]);



const doBillboard=op.inValueBool("billboard",false);

doBillboard.onChange=function()
{
    if(doBillboard.get()) shader.define('BILLBOARD');
        else shader.removeDefine('BILLBOARD');
};

updateOpacity();
updateDiffuseTexture();

};

Ops.Gl.Shader.BasicMaterial_v2.prototype = new CABLES.Op();
CABLES.OPS["51f2207b-daaa-447f-bdbe-87fdd72f0c40"]={f:Ops.Gl.Shader.BasicMaterial_v2,objName:"Ops.Gl.Shader.BasicMaterial_v2"};




// **************************************************************
// 
// Ops.Html.Cursor
// 
// **************************************************************

Ops.Html.Cursor = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    cursorPort = op.inValueSelect("cursor",["auto","crosshair","pointer","hand","move","n-resize","ne-resize","e-resize","se-resize","s-resize","sw-resize","w-resize","nw-resize","text","wait","help", "none"]),
    trigger=op.inTriggerButton("Set Cursor"),
    cgl = op.patch.cgl;

cursorPort.onChange=trigger.onTriggered=update;

function update()
{
    var cursor = cursorPort.get();
    cgl.canvas.style.cursor = cursor;
}



};

Ops.Html.Cursor.prototype = new CABLES.Op();
CABLES.OPS["409f94da-6264-435c-8e73-03e8d2275e04"]={f:Ops.Html.Cursor,objName:"Ops.Html.Cursor"};




// **************************************************************
// 
// Ops.Boolean.TriggerBoolean
// 
// **************************************************************

Ops.Boolean.TriggerBoolean = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};

var inTriggerTrue=op.inTriggerButton("True");
var inTriggerFalse=op.inTriggerButton("false");

var outResult=op.outValueBool("Result");



inTriggerTrue.onTriggered=function()
{
    outResult.set(true);
};

inTriggerFalse.onTriggered=function()
{
    outResult.set(false);
};

};

Ops.Boolean.TriggerBoolean.prototype = new CABLES.Op();
CABLES.OPS["31f65abe-9d6c-4ba6-a291-ef2de41d2087"]={f:Ops.Boolean.TriggerBoolean,objName:"Ops.Boolean.TriggerBoolean"};




// **************************************************************
// 
// Ops.Gl.Performance
// 
// **************************************************************

Ops.Gl.Performance = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe = op.inTrigger("exe"),
    inShow = op.inValueBool("Visible", true),
    next = op.outTrigger("childs"),
    position = op.inSwitch("Position", ["top", "bottom"], "top"),
    openDefault = op.inBool("Open", false),
    smoothGraph = op.inBool("Smooth Graph", true),
    inScaleGraph = op.inFloat("Scale", 4),
    inSizeGraph = op.inFloat("Size", 128),
    outFPS = op.outValue("FPS");

const cgl = op.patch.cgl;
const element = document.createElement("div");

let elementMeasures = null;
let ctx = null;
let opened = false;
let frameCount = 0;
let fps = 0;
let fpsStartTime = 0;
let childsTime = 0;
let avgMsChilds = 0;
const queue = [];
const timesMainloop = [];
const timesOnFrame = [];
const timesGPU = [];
let avgMs = 0;
let selfTime = 0;
let canvas = null;
let lastTime = 0;
let loadingCounter = 0;
const loadingChars = ["|", "/", "-", "\\"];
let initMeasures = true;

const colorRAFSlow = "#ffffff";
const colorBg = "#222222";
const colorRAF = "#003f5c"; // color: https://learnui.design/tools/data-color-picker.html
const colorMainloop = "#7a5195";
const colorOnFrame = "#ef5675";
const colorGPU = "#ffa600";

let startedQuery = false;

let currentTimeGPU = 0;
let currentTimeMainloop = 0;
let currentTimeOnFrame = 0;

const gl = op.patch.cgl.gl;
const glQueryExt = gl.getExtension("EXT_disjoint_timer_query_webgl2");
// let query = null;

exe.onLinkChanged =
    inShow.onChange = () =>
    {
        updateOpened();
        updateVisibility();
    };

position.onChange = updatePos;
inSizeGraph.onChange = updateSize;

element.id = "performance";
element.style.position = "absolute";
element.style.left = "0px";
element.style.opacity = "0.8";
element.style.padding = "10px";
element.style.cursor = "pointer";
element.style.background = "#222";
element.style.color = "white";
element.style["font-family"] = "monospace";
element.style["font-size"] = "12px";
element.style["z-index"] = "99999";

element.innerHTML = "&nbsp;";
element.addEventListener("click", toggleOpened);

const container = op.patch.cgl.canvas.parentElement;
container.appendChild(element);

updateSize();
updateOpened();
updatePos();
updateVisibility();

op.onDelete = function ()
{
    if (canvas)canvas.remove();
    if (element)element.remove();
};

function updatePos()
{
    canvas.style["pointer-events"] = "none";
    if (position.get() == "top")
    {
        canvas.style.top = element.style.top = "0px";
        canvas.style.bottom = element.style.bottom = "initial";
    }
    else
    {
        canvas.style.bottom = element.style.bottom = "0px";
        canvas.style.top = element.style.top = "initial";
    }
}

function updateVisibility()
{
    if (!inShow.get() || !exe.isLinked())
    {
        element.style.display = "none";
        element.style.opacity = 0;
        canvas.style.display = "none";
    }
    else
    {
        element.style.display = "block";
        element.style.opacity = 1;
        canvas.style.display = "block";
    }
}

function updateSize()
{
    if (!canvas) return;

    const num = Math.max(0, parseInt(inSizeGraph.get()));

    canvas.width = num;
    canvas.height = num;
    element.style.left = num + "px";

    queue.length = 0;
    timesMainloop.length = 0;
    timesOnFrame.length = 0;
    timesGPU.length = 0;

    for (let i = 0; i < num; i++)
    {
        queue[i] = -1;
        timesMainloop[i] = -1;
        timesOnFrame[i] = -1;
        timesGPU[i] = -1;
    }
}

openDefault.onChange = function ()
{
    opened = openDefault.get();
    updateOpened();
};

function toggleOpened()
{
    if (!inShow.get()) return;
    element.style.opacity = 1;
    opened = !opened;
    updateOpened();
}

function updateOpened()
{
    updateText();
    if (!canvas)createCanvas();
    if (opened)
    {
        canvas.style.display = "block";
        element.style.left = inSizeGraph.get() + "px";
        element.style["min-height"] = "56px";
    }
    else
    {
        canvas.style.display = "none";
        element.style.left = "0px";
        element.style["min-height"] = "auto";
    }
}

function updateCanvas()
{
    const height = canvas.height;
    const hmul = inScaleGraph.get();

    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, canvas.width, height);
    ctx.fillStyle = colorRAF;

    let k = 0;
    const numBars = Math.max(0, parseInt(inSizeGraph.get()));

    for (k = numBars; k >= 0; k--)
    {
        if (queue[k] > 30)ctx.fillStyle = colorRAFSlow;
        ctx.fillRect(numBars - k, height - queue[k] * hmul, 1, queue[k] * hmul);
        if (queue[k] > 30)ctx.fillStyle = colorRAF;
    }

    for (k = numBars; k >= 0; k--)
    {
        let sum = 0;
        ctx.fillStyle = colorMainloop;
        sum = timesMainloop[k];
        ctx.fillRect(numBars - k, height - sum * hmul, 1, timesMainloop[k] * hmul);

        ctx.fillStyle = colorOnFrame;
        sum += timesOnFrame[k];
        ctx.fillRect(numBars - k, height - sum * hmul, 1, timesOnFrame[k] * hmul);

        ctx.fillStyle = colorGPU;
        sum += timesGPU[k];
        ctx.fillRect(numBars - k, height - sum * hmul, 1, timesGPU[k] * hmul);
    }
}

function createCanvas()
{
    canvas = document.createElement("canvas");
    canvas.id = "performance_" + op.patch.config.glCanvasId;
    canvas.width = inSizeGraph.get();
    canvas.height = inSizeGraph.get();
    canvas.style.display = "block";
    canvas.style.opacity = 0.9;
    canvas.style.position = "absolute";
    canvas.style.left = "0px";
    canvas.style.cursor = "pointer";
    canvas.style.top = "-64px";
    canvas.style["z-index"] = "99998";
    container.appendChild(canvas);
    ctx = canvas.getContext("2d");

    canvas.addEventListener("click", toggleOpened);

    updateSize();
}

function updateText()
{
    if (!inShow.get()) return;
    let warn = "";


    if (op.patch.cgl.profileData.profileShaderCompiles > 0)warn += "Shader compile (" + op.patch.cgl.profileData.profileShaderCompileName + ") ";
    if (op.patch.cgl.profileData.profileShaderGetUniform > 0)warn += "Shader get uni loc! (" + op.patch.cgl.profileData.profileShaderGetUniformName + ")";
    if (op.patch.cgl.profileData.profileTextureResize > 0)warn += "Texture resize! ";
    if (op.patch.cgl.profileData.profileFrameBuffercreate > 0)warn += "Framebuffer create! ";
    if (op.patch.cgl.profileData.profileEffectBuffercreate > 0)warn += "Effectbuffer create! ";
    if (op.patch.cgl.profileData.profileTextureDelete > 0)warn += "Texture delete! ";
    if (op.patch.cgl.profileData.profileNonTypedAttrib > 0)warn += "Not-Typed Buffer Attrib! " + op.patch.cgl.profileData.profileNonTypedAttribNames;
    if (op.patch.cgl.profileData.profileTextureNew > 0)warn += "new texture created! ";
    if (op.patch.cgl.profileData.profileGenMipMap > 0)warn += "generating mip maps!";

    if (warn.length > 0)
    {
        warn = "| <span style=\"color:#f80;\">WARNING: " + warn + "<span>";
    }

    let html = "";

    if (opened)
    {
        html += "<span style=\"color:" + colorRAF + "\">■</span> " + fps + " fps ";
        html += "<span style=\"color:" + colorMainloop + "\">■</span> " + Math.round(currentTimeMainloop * 100) / 100 + "ms mainloop ";
        html += "<span style=\"color:" + colorOnFrame + "\">■</span> " + Math.round((currentTimeOnFrame) * 100) / 100 + "ms onframe ";
        if (currentTimeGPU) html += "<span style=\"color:" + colorGPU + "\">■</span> " + Math.round(currentTimeGPU * 100) / 100 + "ms GPU";
        html += warn;
        element.innerHTML = html;
    }
    else
    {
        html += fps + " fps / ";
        html += "CPU: " + Math.round((currentTimeMainloop + op.patch.cgl.profileData.profileOnAnimFrameOps) * 100) / 100 + "ms / ";
        if (currentTimeGPU)html += "GPU: " + Math.round(currentTimeGPU * 100) / 100 + "ms  ";
        element.innerHTML = html;
    }

    if (op.patch.loading.getProgress() != 1.0)
    {
        element.innerHTML += "<br/>loading " + Math.round(op.patch.loading.getProgress() * 100) + "% " + loadingChars[(++loadingCounter) % loadingChars.length];
    }

    if (opened)
    {
        let count = 0;
        avgMs = 0;
        avgMsChilds = 0;
        for (let i = queue.length; i > queue.length - queue.length / 3; i--)
        {
            if (queue[i] > -1)
            {
                avgMs += queue[i];
                count++;
            }

            if (timesMainloop[i] > -1) avgMsChilds += timesMainloop[i];
        }

        avgMs /= count;
        avgMsChilds /= count;

        element.innerHTML += "<br/> " + cgl.canvasWidth + " x " + cgl.canvasHeight + " (x" + cgl.pixelDensity + ") ";
        element.innerHTML += "<br/>frame avg: " + Math.round(avgMsChilds * 100) / 100 + " ms (" + Math.round(avgMsChilds / avgMs * 100) + "%) / " + Math.round(avgMs * 100) / 100 + " ms";
        element.innerHTML += " (self: " + Math.round((selfTime) * 100) / 100 + " ms) ";

        element.innerHTML += "<br/>shader binds: " + Math.ceil(op.patch.cgl.profileData.profileShaderBinds / fps) +
            " uniforms: " + Math.ceil(op.patch.cgl.profileData.profileUniformCount / fps) +
            " mvp_uni_mat4: " + Math.ceil(op.patch.cgl.profileData.profileMVPMatrixCount / fps) +
            " num glPrimitives: " + Math.ceil(op.patch.cgl.profileData.profileMeshNumElements / (fps)) +

            " mesh.setGeom: " + op.patch.cgl.profileData.profileMeshSetGeom +
            " videos: " + op.patch.cgl.profileData.profileVideosPlaying +
            " tex preview: " + op.patch.cgl.profileData.profileTexPreviews;

        element.innerHTML +=
        " draw meshes: " + Math.ceil(op.patch.cgl.profileData.profileMeshDraw / fps) +
        " framebuffer blit: " + Math.ceil(op.patch.cgl.profileData.profileFramebuffer / fps) +
        " texeffect blit: " + Math.ceil(op.patch.cgl.profileData.profileTextureEffect / fps);

        element.innerHTML += " all shader compiletime: " + Math.round(op.patch.cgl.profileData.shaderCompileTime * 100) / 100;
    }

    op.patch.cgl.profileData.clear();
}

function styleMeasureEle(ele)
{
    ele.style.padding = "0px";
    ele.style.margin = "0px";
}

function addMeasureChild(m, parentEle, timeSum, level)
{
    const height = 20;
    m.usedAvg = (m.usedAvg || m.used);

    if (!m.ele || initMeasures)
    {
        const newEle = document.createElement("div");
        m.ele = newEle;

        if (m.childs && m.childs.length > 0) newEle.style.height = "500px";
        else newEle.style.height = height + "px";

        newEle.style.overflow = "hidden";
        newEle.style.display = "inline-block";

        if (!m.isRoot)
        {
            newEle.innerHTML = "<div style=\"min-height:" + height + "px;width:100%;overflow:hidden;color:black;position:relative\">&nbsp;" + m.name + "</div>";
            newEle.style["background-color"] = "rgb(" + m.colR + "," + m.colG + "," + m.colB + ")";
            newEle.style["border-left"] = "1px solid black";
        }

        parentEle.appendChild(newEle);
    }

    if (!m.isRoot)
    {
        if (performance.now() - m.lastTime > 200)
        {
            m.ele.style.display = "none";
            m.hidden = true;
        }
        else
        {
            if (m.hidden)
            {
                m.ele.style.display = "inline-block";
                m.hidden = false;
            }
        }

        m.ele.style.float = "left";
        m.ele.style.width = Math.floor((m.usedAvg / timeSum) * 98.0) + "%";
    }
    else
    {
        m.ele.style.width = "100%";
        m.ele.style.clear = "both";
        m.ele.style.float = "none";
    }

    if (m && m.childs && m.childs.length > 0)
    {
        let thisTimeSum = 0;
        for (var i = 0; i < m.childs.length; i++)
        {
            m.childs[i].usedAvg = (m.childs[i].usedAvg || m.childs[i].used) * 0.95 + m.childs[i].used * 0.05;
            thisTimeSum += m.childs[i].usedAvg;
        }
        for (var i = 0; i < m.childs.length; i++)
        {
            addMeasureChild(m.childs[i], m.ele, thisTimeSum, level + 1);
        }
    }
}

function clearMeasures(p)
{
    for (let i = 0; i < p.childs.length; i++) clearMeasures(p.childs[i]);
    p.childs.length = 0;
}

function measures()
{
    if (!CGL.performanceMeasures) return;

    if (!elementMeasures)
    {
        op.log("create measure ele");
        elementMeasures = document.createElement("div");
        elementMeasures.style.width = "100%";
        elementMeasures.style["background-color"] = "#444";
        elementMeasures.style.bottom = "10px";
        elementMeasures.style.height = "100px";
        elementMeasures.style.opacity = "1";
        elementMeasures.style.position = "absolute";
        elementMeasures.style["z-index"] = "99999";
        elementMeasures.innerHTML = "";
        container.appendChild(elementMeasures);
    }

    let timeSum = 0;
    const root = CGL.performanceMeasures[0];

    for (let i = 0; i < root.childs.length; i++) timeSum += root.childs[i].used;

    addMeasureChild(CGL.performanceMeasures[0], elementMeasures, timeSum, 0);

    root.childs.length = 0;

    clearMeasures(CGL.performanceMeasures[0]);

    CGL.performanceMeasures.length = 0;
    initMeasures = false;
}

exe.onTriggered = render;

function render()
{
    const selfTimeStart = performance.now();
    frameCount++;

    if (glQueryExt && inShow.get())op.patch.cgl.profileData.doProfileGlQuery = true;

    if (fpsStartTime === 0)fpsStartTime = Date.now();
    if (Date.now() - fpsStartTime >= 1000)
    {
        // query=null;
        fps = frameCount;
        frameCount = 0;
        // frames = 0;
        outFPS.set(fps);
        if (inShow.get())updateText();

        fpsStartTime = Date.now();
    }

    const glQueryData = op.patch.cgl.profileData.glQueryData;
    currentTimeGPU = 0;
    if (glQueryData)
    {
        let count = 0;
        for (let i in glQueryData)
        {
            count++;
            if (glQueryData[i].time)
                currentTimeGPU += glQueryData[i].time;
        }
        // console.log("glquery count",currentTimeGPU)
    }

    if (inShow.get())
    {
        measures();

        if (opened && !op.patch.cgl.profileData.pause)
        {
            const timeUsed = performance.now() - lastTime;
            queue.push(timeUsed);
            queue.shift();

            timesMainloop.push(childsTime);
            timesMainloop.shift();

            timesOnFrame.push(op.patch.cgl.profileData.profileOnAnimFrameOps - op.patch.cgl.profileData.profileMainloopMs);
            timesOnFrame.shift();

            timesGPU.push(currentTimeGPU);
            timesGPU.shift();

            updateCanvas();
        }
    }

    lastTime = performance.now();
    selfTime = performance.now() - selfTimeStart;
    const startTimeChilds = performance.now();

    // startGlQuery();
    next.trigger();
    // endGlQuery();

    const nChildsTime = performance.now() - startTimeChilds;
    const nCurrentTimeMainloop = op.patch.cgl.profileData.profileMainloopMs;
    const nCurrentTimeOnFrame = op.patch.cgl.profileData.profileOnAnimFrameOps - op.patch.cgl.profileData.profileMainloopMs;

    if (smoothGraph.get())
    {
        childsTime = childsTime * 0.9 + nChildsTime * 0.1;
        currentTimeMainloop = currentTimeMainloop * 0.5 + nCurrentTimeMainloop * 0.5;
        currentTimeOnFrame = currentTimeOnFrame * 0.5 + nCurrentTimeOnFrame * 0.5;
    }
    else
    {
        childsTime = nChildsTime;
        currentTimeMainloop = nCurrentTimeMainloop;
        currentTimeOnFrame = nCurrentTimeOnFrame;
    }

    op.patch.cgl.profileData.clearGlQuery();
}


};

Ops.Gl.Performance.prototype = new CABLES.Op();
CABLES.OPS["9cd2d9de-000f-4a14-bd13-e7d5f057583c"]={f:Ops.Gl.Performance,objName:"Ops.Gl.Performance"};




// **************************************************************
// 
// Ops.Devices.Mouse.Mouse_v2
// 
// **************************************************************

Ops.Devices.Mouse.Mouse_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
// when doing a new version: remove smoothing

const
    active = op.inValueBool("Active", true),
    relative = op.inValueBool("relative"),
    normalize = op.inValueBool("normalize"),
    flipY = op.inValueBool("flip y", true),
    area = op.inValueSelect("Area", ["Canvas", "Document", "Parent Element"], "Canvas"),
    rightClickPrevDef = op.inBool("right click prevent default", true),
    touchscreen = op.inValueBool("Touch support", true),
    smooth = op.inValueBool("smooth"),
    smoothSpeed = op.inValueFloat("smoothSpeed", 20),
    multiply = op.inValueFloat("multiply", 1),
    outMouseX = op.outValue("x", 0),
    outMouseY = op.outValue("y", 0),
    mouseDown = op.outValueBool("button down"),
    mouseClick = op.outTrigger("click"),
    mouseUp = op.outTrigger("Button Up"),
    mouseClickRight = op.outTrigger("click right"),
    mouseOver = op.outValueBool("mouseOver"),
    outButton = op.outValue("button");

op.setPortGroup("Behavior", [relative, normalize, flipY, area, rightClickPrevDef, touchscreen]);
op.setPortGroup("Smoothing", [smooth, smoothSpeed, multiply]);

let smoothTimer = 0;
const cgl = op.patch.cgl;
let listenerElement = null;

function setValue(x, y)
{
    if (normalize.get())
    {
        let w = cgl.canvas.width / cgl.pixelDensity;
        let h = cgl.canvas.height / cgl.pixelDensity;
        if (listenerElement == document.body)
        {
            w = listenerElement.clientWidth / cgl.pixelDensity;
            h = listenerElement.clientHeight / cgl.pixelDensity;
        }
        outMouseX.set(((x || 0) / w * 2.0 - 1.0) * multiply.get());
        outMouseY.set(((y || 0) / h * 2.0 - 1.0) * multiply.get());
    }
    else
    {
        outMouseX.set((x || 0) * multiply.get());
        outMouseY.set((y || 0) * multiply.get());
    }
}

smooth.onChange = function ()
{
    if (smooth.get()) smoothTimer = setInterval(updateSmooth, 5);
    else if (smoothTimer)clearTimeout(smoothTimer);
};

let smoothX, smoothY;
let lineX = 0, lineY = 0;

normalize.onChange = function ()
{
    mouseX = 0;
    mouseY = 0;
    setValue(mouseX, mouseY);
};

var mouseX = cgl.canvas.width / 2;
var mouseY = cgl.canvas.height / 2;

lineX = mouseX;
lineY = mouseY;

outMouseX.set(mouseX);
outMouseY.set(mouseY);

let relLastX = 0;
let relLastY = 0;
let offsetX = 0;
let offsetY = 0;
addListeners();

area.onChange = addListeners;

let speed = 0;

function updateSmooth()
{
    speed = smoothSpeed.get();
    if (speed <= 0)speed = 0.01;
    const distanceX = Math.abs(mouseX - lineX);
    const speedX = Math.round(distanceX / speed, 0);
    lineX = (lineX < mouseX) ? lineX + speedX : lineX - speedX;

    const distanceY = Math.abs(mouseY - lineY);
    const speedY = Math.round(distanceY / speed, 0);
    lineY = (lineY < mouseY) ? lineY + speedY : lineY - speedY;

    setValue(lineX, lineY);
}

function onMouseEnter(e)
{
    mouseDown.set(false);
    mouseOver.set(true);
    speed = smoothSpeed.get();
}

function onMouseDown(e)
{
    outButton.set(e.which);
    mouseDown.set(true);
}

function onMouseUp(e)
{
    outButton.set(0);
    mouseDown.set(false);
    mouseUp.trigger();
}

function onClickRight(e)
{
    mouseClickRight.trigger();
    if (rightClickPrevDef.get()) e.preventDefault();
}

function onmouseclick(e)
{
    mouseClick.trigger();
}

function onMouseLeave(e)
{
    relLastX = 0;
    relLastY = 0;

    speed = 100;

    // disabled for now as it makes no sense that the mouse bounces back to the center
    // if(area.get()!='Document')
    // {
    //     // leave anim
    //     if(smooth.get())
    //     {
    //         mouseX=cgl.canvas.width/2;
    //         mouseY=cgl.canvas.height/2;
    //     }

    // }
    mouseOver.set(false);
    mouseDown.set(false);
}

relative.onChange = function ()
{
    offsetX = 0;
    offsetY = 0;
};

function setCoords(e)
{
    if (!relative.get())
    {
        if (area.get() != "Document")
        {
            offsetX = e.offsetX;
            offsetY = e.offsetY;
        }
        else
        {
            offsetX = e.clientX;
            offsetY = e.clientY;
        }

        if (smooth.get())
        {
            mouseX = offsetX;

            if (flipY.get()) mouseY = listenerElement.clientHeight - offsetY;
            else mouseY = offsetY;
        }
        else
        {
            if (flipY.get()) setValue(offsetX, listenerElement.clientHeight - offsetY);
            else setValue(offsetX, offsetY);
        }
    }
    else
    {
        if (relLastX != 0 && relLastY != 0)
        {
            offsetX = e.offsetX - relLastX;
            offsetY = e.offsetY - relLastY;
        }
        else
        {

        }

        relLastX = e.offsetX;
        relLastY = e.offsetY;

        mouseX += offsetX;
        mouseY += offsetY;

        if (mouseY > 460)mouseY = 460;
    }
}

function onmousemove(e)
{
    mouseOver.set(true);
    setCoords(e);
}

function ontouchmove(e)
{
    if (event.touches && event.touches.length > 0) setCoords(e.touches[0]);
}

function ontouchstart(event)
{
    mouseDown.set(true);

    if (event.touches && event.touches.length > 0) onMouseDown(event.touches[0]);
}

function ontouchend(event)
{
    mouseDown.set(false);
    onMouseUp();
}

touchscreen.onChange = function ()
{
    removeListeners();
    addListeners();
};

function removeListeners()
{
    if (!listenerElement) return;
    listenerElement.removeEventListener("touchend", ontouchend);
    listenerElement.removeEventListener("touchstart", ontouchstart);
    listenerElement.removeEventListener("touchmove", ontouchmove);

    listenerElement.removeEventListener("click", onmouseclick);
    listenerElement.removeEventListener("mousemove", onmousemove);
    listenerElement.removeEventListener("mouseleave", onMouseLeave);
    listenerElement.removeEventListener("mousedown", onMouseDown);
    listenerElement.removeEventListener("mouseup", onMouseUp);
    listenerElement.removeEventListener("mouseenter", onMouseEnter);
    listenerElement.removeEventListener("contextmenu", onClickRight);
    listenerElement = null;
}

function addListeners()
{
    if (listenerElement || !active.get())removeListeners();
    if (!active.get()) return;

    listenerElement = cgl.canvas;
    if (area.get() == "Document") listenerElement = document.body;
    if (area.get() == "Parent Element") listenerElement = cgl.canvas.parentElement;

    if (touchscreen.get())
    {
        listenerElement.addEventListener("touchend", ontouchend);
        listenerElement.addEventListener("touchstart", ontouchstart);
        listenerElement.addEventListener("touchmove", ontouchmove);
    }

    listenerElement.addEventListener("mousemove", onmousemove);
    listenerElement.addEventListener("mouseleave", onMouseLeave);
    listenerElement.addEventListener("mousedown", onMouseDown);
    listenerElement.addEventListener("mouseup", onMouseUp);
    listenerElement.addEventListener("mouseenter", onMouseEnter);
    listenerElement.addEventListener("contextmenu", onClickRight);
    listenerElement.addEventListener("click", onmouseclick);
}

active.onChange = function ()
{
    if (listenerElement)removeListeners();
    if (active.get())addListeners();
};

op.onDelete = function ()
{
    removeListeners();
};

addListeners();


};

Ops.Devices.Mouse.Mouse_v2.prototype = new CABLES.Op();
CABLES.OPS["9fa3fc46-3147-4e3a-8ee8-a93ea9e8786e"]={f:Ops.Devices.Mouse.Mouse_v2,objName:"Ops.Devices.Mouse.Mouse_v2"};




// **************************************************************
// 
// Ops.Boolean.ToggleBool
// 
// **************************************************************

Ops.Boolean.ToggleBool = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    trigger = op.inTriggerButton("trigger"),
    reset = op.inTriggerButton("reset"),
    outBool = op.outBool("result"),
    inDefault = op.inBool("Default", false);

let theBool = false;
outBool.set(theBool);
outBool.ignoreValueSerialize = true;

trigger.onTriggered = function ()
{
    theBool = !theBool;
    outBool.set(theBool);
};

reset.onTriggered = function ()
{
    theBool = inDefault.get();
    outBool.set(theBool);
};


};

Ops.Boolean.ToggleBool.prototype = new CABLES.Op();
CABLES.OPS["712a25f4-3a93-4042-b8c5-2f56169186cc"]={f:Ops.Boolean.ToggleBool,objName:"Ops.Boolean.ToggleBool"};




// **************************************************************
// 
// Ops.TimeLine.PreRender
// 
// **************************************************************

Ops.TimeLine.PreRender = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exec = op.inTrigger("Render"),
    next = op.outTrigger("Next"),
    progress = op.outTrigger("Render Progress"),
    done = op.outTrigger("Done"),
    inMaxTime = op.inInt("Max Time", 1),

    inStep = op.inInt("Step", 30),
    inReset = op.inTriggerButton("Reset"),
    outProgress = op.outNumber("Progress", 0);

exec.onTriggered = render;

let start = true;
let curTime = -1;
let wait = true;

inReset.onTriggered = function ()
{
    if (curTime < 0)
        start = true;
};

function render()
{
    if (!start && curTime < 0)
    {
        if (!wait)
            next.trigger();
        wait = false;
        return;
    }

    const maxTime = inMaxTime.get();
    if (start)
    {
        curTime = maxTime;
        start = false;
        wait = true;
    }

    const oldInternalNow = CABLES.internalNow;
    CABLES.internalNow = function ()
    {
        return curTime * 1000;
    };

    CABLES.overwriteTime = curTime;
    op.patch.timer.setTime(curTime);
    op.patch.freeTimer.setTime(curTime);

    outProgress.set((maxTime - curTime) / maxTime);

    next.trigger();
    next.trigger();
    next.trigger();

    CABLES.overwriteTime = undefined;
    CABLES.internalNow = oldInternalNow;

    progress.trigger();

    if (curTime === 0)
    {
        done.trigger();
        curTime = -1;
    }
    else
    {
        curTime -= inStep.get();
        if (curTime < 0)
            curTime = 0;
    }
}


};

Ops.TimeLine.PreRender.prototype = new CABLES.Op();
CABLES.OPS["294efbca-f2b6-46fa-8b28-0530d6b9f9c8"]={f:Ops.TimeLine.PreRender,objName:"Ops.TimeLine.PreRender"};




// **************************************************************
// 
// Ops.Math.Compare.Equals
// 
// **************************************************************

Ops.Math.Compare.Equals = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const number1 = op.inValue("number1",1);
const number2 = op.inValue("number2",1);
const result = op.outValue("result");


number1.onChange=exec;
number2.onChange=exec;
exec();

function exec()
{
    result.set( number1.get() == number2.get() );
}



};

Ops.Math.Compare.Equals.prototype = new CABLES.Op();
CABLES.OPS["4dd3cc55-eebc-4187-9d4e-2e053a956fab"]={f:Ops.Math.Compare.Equals,objName:"Ops.Math.Compare.Equals"};




// **************************************************************
// 
// Ops.Boolean.IfTrueThen_v2
// 
// **************************************************************

Ops.Boolean.IfTrueThen_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe=op.inTrigger("exe"),
    boolean=op.inValueBool("boolean",false),
    triggerThen=op.outTrigger("then"),
    triggerElse=op.outTrigger("else");

exe.onTriggered=exec;

function exec()
{
    if(boolean.get()) triggerThen.trigger();
    else triggerElse.trigger();
}



};

Ops.Boolean.IfTrueThen_v2.prototype = new CABLES.Op();
CABLES.OPS["9549e2ed-a544-4d33-a672-05c7854ccf5d"]={f:Ops.Boolean.IfTrueThen_v2,objName:"Ops.Boolean.IfTrueThen_v2"};




// **************************************************************
// 
// Ops.TimeLine.TimeLinePlay
// 
// **************************************************************

Ops.TimeLine.TimeLinePlay = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const play=op.inTriggerButton("Play");

play.onTriggered=function()
{
    op.patch.timer.play();
};


};

Ops.TimeLine.TimeLinePlay.prototype = new CABLES.Op();
CABLES.OPS["fc75b841-a55f-4474-8746-61218588598d"]={f:Ops.TimeLine.TimeLinePlay,objName:"Ops.TimeLine.TimeLinePlay"};




// **************************************************************
// 
// Ops.Math.OneMinus
// 
// **************************************************************

Ops.Math.OneMinus = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const inValue=op.inValue("Value");
const result=op.outValue("Result");

inValue.onChange=update;
update();

function update()
{
    result.set(1-inValue.get());
}



};

Ops.Math.OneMinus.prototype = new CABLES.Op();
CABLES.OPS["f34d019d-59ae-40d6-a55d-a7691bbc40e0"]={f:Ops.Math.OneMinus,objName:"Ops.Math.OneMinus"};




// **************************************************************
// 
// Ops.Gl.Shader.BasicMaterial_v3
// 
// **************************************************************

Ops.Gl.Shader.BasicMaterial_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={basicmaterial_frag:"{{MODULES_HEAD}}\n\nIN vec2 texCoord;\n\n#ifdef VERTEX_COLORS\nIN vec4 vertCol;\n#endif\n\n#ifdef HAS_TEXTURES\n    IN vec2 texCoordOrig;\n    #ifdef HAS_TEXTURE_DIFFUSE\n        UNI sampler2D tex;\n    #endif\n    #ifdef HAS_TEXTURE_OPACITY\n        UNI sampler2D texOpacity;\n   #endif\n#endif\n\nvoid main()\n{\n    {{MODULE_BEGIN_FRAG}}\n    vec4 col=color;\n\n\n    #ifdef HAS_TEXTURES\n        vec2 uv=texCoord;\n\n        #ifdef CROP_TEXCOORDS\n            if(uv.x<0.0 || uv.x>1.0 || uv.y<0.0 || uv.y>1.0) discard;\n        #endif\n\n        #ifdef HAS_TEXTURE_DIFFUSE\n            col=texture(tex,uv);\n\n            #ifdef COLORIZE_TEXTURE\n                col.r*=color.r;\n                col.g*=color.g;\n                col.b*=color.b;\n            #endif\n        #endif\n        col.a*=color.a;\n        #ifdef HAS_TEXTURE_OPACITY\n            #ifdef TRANSFORMALPHATEXCOORDS\n                uv=texCoordOrig;\n            #endif\n            #ifdef ALPHA_MASK_ALPHA\n                col.a*=texture(texOpacity,uv).a;\n            #endif\n            #ifdef ALPHA_MASK_LUMI\n                col.a*=dot(vec3(0.2126,0.7152,0.0722), texture(texOpacity,uv).rgb);\n            #endif\n            #ifdef ALPHA_MASK_R\n                col.a*=texture(texOpacity,uv).r;\n            #endif\n            #ifdef ALPHA_MASK_G\n                col.a*=texture(texOpacity,uv).g;\n            #endif\n            #ifdef ALPHA_MASK_B\n                col.a*=texture(texOpacity,uv).b;\n            #endif\n            // #endif\n        #endif\n    #endif\n\n    {{MODULE_COLOR}}\n\n    #ifdef DISCARDTRANS\n        if(col.a<0.2) discard;\n    #endif\n\n    #ifdef VERTEX_COLORS\n        col*=vertCol;\n    #endif\n\n    outColor = col;\n}\n",basicmaterial_vert:"IN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN vec3 attrVertNormal;\nIN float attrVertIndex;\n\n{{MODULES_HEAD}}\n\nOUT vec3 norm;\nOUT vec2 texCoord;\nOUT vec2 texCoordOrig;\n\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\n\n#ifdef HAS_TEXTURES\n    UNI float diffuseRepeatX;\n    UNI float diffuseRepeatY;\n    UNI float texOffsetX;\n    UNI float texOffsetY;\n#endif\n\n#ifdef VERTEX_COLORS\n    in vec4 attrVertColor;\n    out vec4 vertCol;\n\n#endif\n\n\nvoid main()\n{\n    mat4 mMatrix=modelMatrix;\n    mat4 mvMatrix;\n\n    norm=attrVertNormal;\n    texCoordOrig=attrTexCoord;\n    texCoord=attrTexCoord;\n    #ifdef HAS_TEXTURES\n        texCoord.x=texCoord.x*diffuseRepeatX+texOffsetX;\n        texCoord.y=(1.0-texCoord.y)*diffuseRepeatY+texOffsetY;\n    #endif\n\n    #ifdef VERTEX_COLORS\n        vertCol=attrVertColor;\n    #endif\n\n    vec4 pos = vec4(vPosition, 1.0);\n\n    #ifdef BILLBOARD\n       vec3 position=vPosition;\n       mvMatrix=viewMatrix*modelMatrix;\n\n       gl_Position = projMatrix * mvMatrix * vec4((\n           position.x * vec3(\n               mvMatrix[0][0],\n               mvMatrix[1][0],\n               mvMatrix[2][0] ) +\n           position.y * vec3(\n               mvMatrix[0][1],\n               mvMatrix[1][1],\n               mvMatrix[2][1]) ), 1.0);\n    #endif\n\n    {{MODULE_VERTEX_POSITION}}\n\n    #ifndef BILLBOARD\n        mvMatrix=viewMatrix * mMatrix;\n    #endif\n\n\n    #ifndef BILLBOARD\n        // gl_Position = projMatrix * viewMatrix * modelMatrix * pos;\n        gl_Position = projMatrix * mvMatrix * pos;\n    #endif\n}\n",};
const render = op.inTrigger("render");

const trigger = op.outTrigger("trigger");
const shaderOut = op.outObject("shader", null, "shader");

shaderOut.ignoreValueSerialize = true;

op.toWorkPortsNeedToBeLinked(render);

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "basicmaterialnew");
shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);
shader.setSource(attachments.basicmaterial_vert, attachments.basicmaterial_frag);
shaderOut.set(shader);

render.onTriggered = doRender;

// rgba colors
const r = op.inValueSlider("r", Math.random());
const g = op.inValueSlider("g", Math.random());
const b = op.inValueSlider("b", Math.random());
const a = op.inValueSlider("a", 1);
r.setUiAttribs({ "colorPick": true });

// const uniColor=new CGL.Uniform(shader,'4f','color',r,g,b,a);
const colUni = shader.addUniformFrag("4f", "color", r, g, b, a);

shader.uniformColorDiffuse = colUni;

// diffuse outTexture

const diffuseTexture = op.inTexture("texture");
let diffuseTextureUniform = null;
diffuseTexture.onChange = updateDiffuseTexture;

const colorizeTexture = op.inValueBool("colorizeTexture", false);
const vertexColors = op.inValueBool("Vertex Colors", false);

// opacity texture
const textureOpacity = op.inTexture("textureOpacity");
let textureOpacityUniform = null;

const alphaMaskSource = op.inSwitch("Alpha Mask Source", ["Luminance", "R", "G", "B", "A"], "Luminance");
alphaMaskSource.setUiAttribs({ "greyout": true });
textureOpacity.onChange = updateOpacity;

const texCoordAlpha = op.inValueBool("Opacity TexCoords Transform", false);
const discardTransPxl = op.inValueBool("Discard Transparent Pixels");

// texture coords

const
    diffuseRepeatX = op.inValue("diffuseRepeatX", 1),
    diffuseRepeatY = op.inValue("diffuseRepeatY", 1),
    diffuseOffsetX = op.inValue("Tex Offset X", 0),
    diffuseOffsetY = op.inValue("Tex Offset Y", 0),
    cropRepeat = op.inBool("Crop TexCoords", false);

shader.addUniformFrag("f", "diffuseRepeatX", diffuseRepeatX);
shader.addUniformFrag("f", "diffuseRepeatY", diffuseRepeatY);
shader.addUniformFrag("f", "texOffsetX", diffuseOffsetX);
shader.addUniformFrag("f", "texOffsetY", diffuseOffsetY);

const doBillboard = op.inValueBool("billboard", false);

alphaMaskSource.onChange =
    doBillboard.onChange =
    discardTransPxl.onChange =
    texCoordAlpha.onChange =
    cropRepeat.onChange =
    vertexColors.onChange =
    colorizeTexture.onChange = updateDefines;

op.setPortGroup("Color", [r, g, b, a]);
op.setPortGroup("Color Texture", [diffuseTexture, vertexColors, colorizeTexture]);
op.setPortGroup("Opacity", [textureOpacity, alphaMaskSource, discardTransPxl, texCoordAlpha]);
op.setPortGroup("Texture Transform", [diffuseRepeatX, diffuseRepeatY, diffuseOffsetX, diffuseOffsetY, cropRepeat]);

updateOpacity();
updateDiffuseTexture();

op.preRender = function ()
{
    shader.bind();
    doRender();
};

function doRender()
{
    if (!shader) return;

    cgl.pushShader(shader);
    shader.popTextures();

    if (diffuseTextureUniform && diffuseTexture.get()) shader.pushTexture(diffuseTextureUniform, diffuseTexture.get());
    if (textureOpacityUniform && textureOpacity.get()) shader.pushTexture(textureOpacityUniform, textureOpacity.get());

    trigger.trigger();

    cgl.popShader();
}

function updateOpacity()
{
    if (textureOpacity.get())
    {
        if (textureOpacityUniform !== null) return;
        shader.removeUniform("texOpacity");
        shader.define("HAS_TEXTURE_OPACITY");
        if (!textureOpacityUniform)textureOpacityUniform = new CGL.Uniform(shader, "t", "texOpacity");

        alphaMaskSource.setUiAttribs({ "greyout": false });
        texCoordAlpha.setUiAttribs({ "greyout": false });
    }
    else
    {
        shader.removeUniform("texOpacity");
        shader.removeDefine("HAS_TEXTURE_OPACITY");
        textureOpacityUniform = null;

        alphaMaskSource.setUiAttribs({ "greyout": true });
        texCoordAlpha.setUiAttribs({ "greyout": true });
    }

    updateDefines();
}

function updateDiffuseTexture()
{
    if (diffuseTexture.get())
    {
        if (!shader.hasDefine("HAS_TEXTURE_DIFFUSE"))shader.define("HAS_TEXTURE_DIFFUSE");
        if (!diffuseTextureUniform)diffuseTextureUniform = new CGL.Uniform(shader, "t", "texDiffuse");

        diffuseRepeatX.setUiAttribs({ "greyout": false });
        diffuseRepeatY.setUiAttribs({ "greyout": false });
        diffuseOffsetX.setUiAttribs({ "greyout": false });
        diffuseOffsetY.setUiAttribs({ "greyout": false });
        colorizeTexture.setUiAttribs({ "greyout": false });
    }
    else
    {
        shader.removeUniform("texDiffuse");
        shader.removeDefine("HAS_TEXTURE_DIFFUSE");
        diffuseTextureUniform = null;

        diffuseRepeatX.setUiAttribs({ "greyout": true });
        diffuseRepeatY.setUiAttribs({ "greyout": true });
        diffuseOffsetX.setUiAttribs({ "greyout": true });
        diffuseOffsetY.setUiAttribs({ "greyout": true });
        colorizeTexture.setUiAttribs({ "greyout": true });
    }
}

function updateDefines()
{
    shader.toggleDefine("VERTEX_COLORS", vertexColors.get());
    shader.toggleDefine("CROP_TEXCOORDS", cropRepeat.get());
    shader.toggleDefine("COLORIZE_TEXTURE", colorizeTexture.get());
    shader.toggleDefine("TRANSFORMALPHATEXCOORDS", texCoordAlpha.get());
    shader.toggleDefine("DISCARDTRANS", discardTransPxl.get());
    shader.toggleDefine("BILLBOARD", doBillboard.get());

    shader.toggleDefine("ALPHA_MASK_ALPHA", alphaMaskSource.get() == "A");
    shader.toggleDefine("ALPHA_MASK_LUMI", alphaMaskSource.get() == "Luminance");
    shader.toggleDefine("ALPHA_MASK_R", alphaMaskSource.get() == "R");
    shader.toggleDefine("ALPHA_MASK_G", alphaMaskSource.get() == "G");
    shader.toggleDefine("ALPHA_MASK_B", alphaMaskSource.get() == "B");
}


};

Ops.Gl.Shader.BasicMaterial_v3.prototype = new CABLES.Op();
CABLES.OPS["ec55d252-3843-41b1-b731-0482dbd9e72b"]={f:Ops.Gl.Shader.BasicMaterial_v3,objName:"Ops.Gl.Shader.BasicMaterial_v3"};




// **************************************************************
// 
// Ops.Value.Boolean
// 
// **************************************************************

Ops.Value.Boolean = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const v=op.inValueBool("value",false);
const result=op.outValueBool("result");

result.set(false);
v.onChange=exec;

function exec()
{
    if(result.get()!=v.get()) result.set(v.get());
}



};

Ops.Value.Boolean.prototype = new CABLES.Op();
CABLES.OPS["83e2d74c-9741-41aa-a4d7-1bda4ef55fb3"]={f:Ops.Value.Boolean,objName:"Ops.Value.Boolean"};




// **************************************************************
// 
// Ops.Boolean.TriggerChangedTrue
// 
// **************************************************************

Ops.Boolean.TriggerChangedTrue = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};

var val=op.inValueBool("Value",false);

var next=op.outTrigger("Next");

var oldVal=0;

val.onChange=function()
{
    var newVal=val.get();
    if(!oldVal && newVal)
    {
        oldVal=true;
        next.trigger();
    }
    else
    {
        oldVal=false;
    }
};

};

Ops.Boolean.TriggerChangedTrue.prototype = new CABLES.Op();
CABLES.OPS["385197e1-8b34-4d1c-897f-d1386d99e3b3"]={f:Ops.Boolean.TriggerChangedTrue,objName:"Ops.Boolean.TriggerChangedTrue"};




// **************************************************************
// 
// Ops.TimeLine.TimeLineRewind
// 
// **************************************************************

Ops.TimeLine.TimeLineRewind = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
var exe=op.inTriggerButton("exe");

exe.onTriggered=function()
{
    op.patch.timer.setTime(0);
};


};

Ops.TimeLine.TimeLineRewind.prototype = new CABLES.Op();
CABLES.OPS["d3408604-858c-4226-8d4c-1ef669956f35"]={f:Ops.TimeLine.TimeLineRewind,objName:"Ops.TimeLine.TimeLineRewind"};




// **************************************************************
// 
// Ops.Math.DeltaSum
// 
// **************************************************************

Ops.Math.DeltaSum = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inVal = op.inValue("Delta Value"),
    defVal = op.inValue("Default Value", 0),
    inMul = op.inValue("Multiply", 1),
    inReset = op.inTriggerButton("Reset"),
    inLimit = op.inValueBool("Limit", false),
    inMin = op.inValue("Min", 0),
    inMax = op.inValue("Max", 100),
    inRubber = op.inValue("Rubberband", 0),
    outVal = op.outValue("Absolute Value");

inVal.changeAlways = true;

op.setPortGroup("Limit", [inLimit, inMin, inMax, inRubber]);

let value = 0;
let lastEvent = CABLES.now();
let rubTimeout = null;

inLimit.onChange = updateLimit;
defVal.onChange =
    inReset.onTriggered = resetValue;

inMax.onChange =
    inMin.onChange = updateValue;

updateLimit();

function resetValue()
{
    let v = defVal.get();

    if (inLimit.get())
    {
        v = Math.max(inMin.get(), v);
        v = Math.min(inMax.get(), v);
    }

    value = v;
    outVal.set(value);
}

function updateLimit()
{
    inMin.setUiAttribs({ "greyout": !inLimit.get() });
    inMax.setUiAttribs({ "greyout": !inLimit.get() });
    inRubber.setUiAttribs({ "greyout": !inLimit.get() });

    updateValue();
}

function releaseRubberband()
{
    const min = inMin.get();
    const max = inMax.get();

    if (value < min) value = min;
    if (value > max) value = max;

    outVal.set(value);
}

function updateValue()
{
    if (inLimit.get())
    {
        const min = inMin.get();
        const max = inMax.get();
        const rubber = inRubber.get();
        const minr = inMin.get() - rubber;
        const maxr = inMax.get() + rubber;

        if (value < minr) value = minr;
        if (value > maxr) value = maxr;

        if (rubber !== 0.0)
        {
            clearTimeout(rubTimeout);
            rubTimeout = setTimeout(releaseRubberband.bind(this), 300);
        }
    }

    outVal.set(value);
}

inVal.onChange = function ()
{
    let v = inVal.get();

    const rubber = inRubber.get();

    if (rubber !== 0.0)
    {
        const min = inMin.get();
        const max = inMax.get();
        const minr = inMin.get() - rubber;
        const maxr = inMax.get() + rubber;

        if (value < min)
        {
            const aa = Math.abs(value - minr) / rubber;
            v *= (aa * aa);
        }
        if (value > max)
        {
            const aa = Math.abs(maxr - value) / rubber;
            v *= (aa * aa);
        }
    }

    lastEvent = CABLES.now();
    value += v * inMul.get();
    updateValue();
};


};

Ops.Math.DeltaSum.prototype = new CABLES.Op();
CABLES.OPS["d9d4b3db-c24b-48da-b798-9e6230d861f7"]={f:Ops.Math.DeltaSum,objName:"Ops.Math.DeltaSum"};




// **************************************************************
// 
// Ops.Anim.TimeDelta
// 
// **************************************************************

Ops.Anim.TimeDelta = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe=op.inTriggerButton("exe"),
    smooth=op.inValueBool("Smooth",false),
    seconds=op.inValueBool("Seconds",false),
    trigger=op.outTrigger('trigger'),
    result=op.outValue("result");

var lastTime=CABLES.now();
var diff=0;
var smoothed=-1;

exe.onTriggered=function()
{
    diff=(CABLES.now()-lastTime);
    if(seconds.get()) diff/=1000;

    if(smooth.get())
    {
        if(smoothed==-1)smoothed=diff;
        else
        {
            smoothed=smoothed*0.8+diff*0.2;
            diff=smoothed;
        }
    }

    result.set( diff );
    lastTime=CABLES.now();
    trigger.trigger();
};

exe.onTriggered();


};

Ops.Anim.TimeDelta.prototype = new CABLES.Op();
CABLES.OPS["fba0e516-b50e-4372-9a0c-dc605669ffed"]={f:Ops.Anim.TimeDelta,objName:"Ops.Anim.TimeDelta"};




// **************************************************************
// 
// Ops.Vars.VarGetNumber_v2
// 
// **************************************************************

Ops.Vars.VarGetNumber_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
var val=op.outValue("Value");
op.varName=op.inValueSelect("Variable",[],"",true);



new CABLES.VarGetOpWrapper(op,"number",op.varName,val);


};

Ops.Vars.VarGetNumber_v2.prototype = new CABLES.Op();
CABLES.OPS["421f5b52-c0fa-47c4-8b7a-012b9e1c864a"]={f:Ops.Vars.VarGetNumber_v2,objName:"Ops.Vars.VarGetNumber_v2"};




// **************************************************************
// 
// Ops.Math.Clamp
// 
// **************************************************************

Ops.Math.Clamp = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const val=op.inValueFloat("val",0.5);
const min=op.inValueFloat("min",0);
const max=op.inValueFloat("max",1);
const ignore=op.inValueBool("ignore outside values");
const result=op.outValue("result");

val.onChange=min.onChange=max.onChange=clamp;

function clamp()
{
    if(ignore.get())
    {
        if(val.get()>max.get()) return;
        if(val.get()<min.get()) return;
    }
    result.set( Math.min(Math.max(val.get(), min.get()), max.get()));
}



};

Ops.Math.Clamp.prototype = new CABLES.Op();
CABLES.OPS["cda1a98e-5e16-40bd-9b18-a67e9eaad5a1"]={f:Ops.Math.Clamp,objName:"Ops.Math.Clamp"};




// **************************************************************
// 
// Ops.Math.Math
// 
// **************************************************************

Ops.Math.Math = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const num0 = op.inFloat("number 0",0),
    num1 = op.inFloat("number 1",0),
    mathDropDown = op.inSwitch("math mode",['+','-','*','/','%','min','max'], "+"),
    result = op.outNumber("result");

var mathFunc;

num0.onChange = num1.onChange = update;
mathDropDown.onChange = onFilterChange;

var n0=0;
var n1=0;

const mathFuncAdd = function(a,b){return a+b};
const mathFuncSub = function(a,b){return a-b};
const mathFuncMul = function(a,b){return a*b};
const mathFuncDiv = function(a,b){return a/b};
const mathFuncMod = function(a,b){return a%b};
const mathFuncMin = function(a,b){return Math.min(a,b)};
const mathFuncMax = function(a,b){return Math.max(a,b)};


function onFilterChange()
{
    var mathSelectValue = mathDropDown.get();

    if(mathSelectValue == '+')         mathFunc = mathFuncAdd;
    else if(mathSelectValue == '-')    mathFunc = mathFuncSub;
    else if(mathSelectValue == '*')    mathFunc = mathFuncMul;
    else if(mathSelectValue == '/')    mathFunc = mathFuncDiv;
    else if(mathSelectValue == '%')    mathFunc = mathFuncMod;
    else if(mathSelectValue == 'min')  mathFunc = mathFuncMin;
    else if(mathSelectValue == 'max')  mathFunc = mathFuncMax;
    update();
    op.setUiAttrib({"extendTitle":mathSelectValue});
}

function update()
{
   n0 = num0.get();
   n1 = num1.get();

   result.set(mathFunc(n0,n1));
}

onFilterChange();


};

Ops.Math.Math.prototype = new CABLES.Op();
CABLES.OPS["e9fdcaca-a007-4563-8a4d-e94e08506e0f"]={f:Ops.Math.Math,objName:"Ops.Math.Math"};




// **************************************************************
// 
// Ops.WebAudio.FFTAreaAverage_v2
// 
// **************************************************************

Ops.WebAudio.FFTAreaAverage_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const cgl = op.patch.cgl;
const TEX_SIZES = [128, 256, 512, 1024, 2048];
const
    refresh = op.inTriggerButton("Refresh"),
    fftArr = op.inArray("FFT Array"),
    x = op.inValueSlider("X Position"),
    y = op.inValueSlider("Y Position"),
    w = op.inValueSlider("Width", 0.2),
    h = op.inValueSlider("Height", 0.2),
    drawTex = op.inValueBool("Create Texture", true),
    inCanvasSize = op.inSwitch("Texture Size", TEX_SIZES, 128),
    texOut = op.outTexture("Texture Out", null, "texture"),
    value = op.outValue("Area Average Volume");

op.setPortGroup("Area Settings", [x, y, w, h]);
op.setPortGroup("Texture Settings", [drawTex, inCanvasSize]);

let updateTexture = false;
inCanvasSize.onChange = () =>
{
    updateTexture = true;
};
const data = [];
const line = 0;
let size = Number(inCanvasSize.get());

const canvas = document.createElement("canvas");
canvas.id = "fft_" + CABLES.uuid();
canvas.width = canvas.height = size;
canvas.style.display = "none";
const body = document.getElementsByTagName("body")[0];
body.appendChild(canvas);
const ctx = canvas.getContext("2d");

const MULTIPLIERS = [0.5, 1, 2, 4, 8];
let multiplier = 1;

let areaX = 0;
let areaY = 0;
let areaW = 20;
let areaH = 20;
let amount = 0;

refresh.onTriggered = function ()
{
    const arr = fftArr.get();
    if (!arr)
    {
        return;
    }

    const width = arr.length;

    const draw = drawTex.get();

    if (updateTexture)
    {
        size = Number(inCanvasSize.get());
        canvas.width = canvas.height = size;

        const indexOfSize = TEX_SIZES.indexOf(Number(inCanvasSize.get()));
        multiplier = MULTIPLIERS[indexOfSize];

        updateTexture = false;
    }

    if (draw)
    {
        ctx.beginPath();
        ctx.fillStyle = "#000";
        ctx.strokeStyle = "#ff0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#888";
        for (let i = 0; i < arr.length; i++)
            ctx.fillRect(i, size - arr[i] * multiplier, 1, arr[i] * multiplier);
    }

    areaX = x.get() * canvas.width;
    areaY = y.get() * canvas.height;

    areaW = w.get() * size / 2;
    areaH = h.get() * size / 2;

    if (draw)ctx.rect(areaX, areaY, areaW, areaH);
    if (draw)
    {
        ctx.lineWidth = 2 * multiplier;
        ctx.stroke();
    }

    const val = 0;
    let count = 0;
    for (let xc = areaX; xc < areaX + areaW; xc++)
        for (let yc = areaY; yc < areaY + areaH; yc++)
            if (arr[Math.round(xc)] * multiplier > size - yc)count++;

    if (amount != amount)amount = 0;
    amount += count / (areaW * areaH);
    amount /= 2;
    value.set(amount);

    if (draw)
    {
        ctx.fillStyle = "#ff0";
        ctx.fillRect(0, 0, amount * canvas.width, 6 * multiplier);

        if (texOut.get()) texOut.get().initTexture(canvas, CGL.Texture.FILTER_NEAREST);
        else
        {
            texOut.set(new CGL.Texture.createFromImage(cgl, canvas, { "filter": CGL.Texture.FILTER_NEAREST }));
        }
    }
};


};

Ops.WebAudio.FFTAreaAverage_v2.prototype = new CABLES.Op();
CABLES.OPS["8dd14fde-57d1-408c-a3ef-441a65bfe53a"]={f:Ops.WebAudio.FFTAreaAverage_v2,objName:"Ops.WebAudio.FFTAreaAverage_v2"};




// **************************************************************
// 
// Ops.Gl.MeshInstancer_v4
// 
// **************************************************************

Ops.Gl.MeshInstancer_v4 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={instancer_body_frag:"#ifdef COLORIZE_INSTANCES\n    #ifdef BLEND_MODE_MULTIPLY\n        col.rgb *= frag_instColor.rgb;\n        col.a *= frag_instColor.a;\n    #endif\n\n    #ifdef BLEND_MODE_ADD\n        col.rgb += frag_instColor.rgb;\n        col.a += frag_instColor.a;\n    #endif\n\n    #ifdef BLEND_MODE_NONE\n        col.rgb = frag_instColor.rgb;\n        col.a = frag_instColor.a;\n    #endif\n#endif\n",instancer_body_vert:"\n\n#ifdef HAS_TEXCOORDS\ntexCoord=(texCoord*instTexCoords.zw)+instTexCoords.xy;\n#endif\n\nmMatrix*=instMat;\npos.xyz*=MOD_scale;\n\n#ifdef HAS_COLORS\nfrag_instColor=instColor;\n#endif\n#ifndef HAS_COLORS\nfrag_instColor=vec4(1.0);\n#endif\n\n",instancer_head_frag:"IN vec4 frag_instColor;\n",instancer_head_vert:"\nIN vec4 instColor;\nIN mat4 instMat;\nIN vec4 instTexCoords;\nOUT mat4 instModelMat;\nOUT vec4 frag_instColor;\n\n#define INSTANCING",};
const
    exe = op.inTrigger("exe"),
    geom = op.inObject("geom"),
    inScale = op.inValue("Scale", 1),
    doLimit = op.inValueBool("Limit Instances", false),
    inLimit = op.inValueInt("Limit", 100),
    inTranslates = op.inArray("positions"),
    inScales = op.inArray("Scale Array"),
    inRot = op.inArray("Rotations"),
    inRotMeth = op.inSwitch("Rotation Type", ["Euler", "Quaternions"], "Euler"),
    inBlendMode = op.inSwitch("Material blend mode", ["Multiply", "Add", "Normal"], "Multiply"),
    inColor = op.inArray("Colors"),
    inTexCoords = op.inArray("TexCoords"),
    outTrigger = op.outTrigger("Trigger Out"),
    outNum = op.outValue("Num");

op.setPortGroup("Limit Number of Instances", [inLimit, doLimit]);
op.setPortGroup("Parameters", [inScales, inRot, inTranslates, inRotMeth]);
op.toWorkPortsNeedToBeLinked(geom);
op.toWorkPortsNeedToBeLinked(exe);

geom.ignoreValueSerialize = true;

const cgl = op.patch.cgl;
const m = mat4.create();
let
    matrixArray = new Float32Array(1),
    instColorArray = new Float32Array(1),
    instTexcoordArray = new Float32Array(1),
    mesh = null,
    recalc = true,
    num = 0,
    arrayChangedColor = true,
    arrayChangedTexcoords = true,
    arrayChangedTrans = true;

const mod = new CGL.ShaderModifier(cgl, op.name);
mod.addModule({
    "name": "MODULE_VERTEX_POSITION",
    "title": op.name,
    "priority": -2,
    "srcHeadVert": attachments.instancer_head_vert,
    "srcBodyVert": attachments.instancer_body_vert
});

mod.addModule({
    "name": "MODULE_COLOR",
    "priority": -2,
    "title": op.name,
    "srcHeadFrag": attachments.instancer_head_frag,
    "srcBodyFrag": attachments.instancer_body_frag,
});

mod.addUniformVert("f", "MOD_scale", inScale);

let needsUpdateDefines = true;
inBlendMode.onChange = () => { needsUpdateDefines = true; };
doLimit.onChange = updateLimit;
exe.onTriggered = doRender;
exe.onLinkChanged = function ()
{
    if (!exe.isLinked()) removeModule();
};

updateLimit();

inRot.onChange =
inScales.onChange =
inTranslates.onChange =
inRotMeth.onChange =
    function ()
    {
        arrayChangedTrans = true;
        recalc = true;
    };

inTexCoords.onChange = function ()
{
    arrayChangedTexcoords = true;
    recalc = true;
    needsUpdateDefines = true;
};

inColor.onChange = function ()
{
    arrayChangedColor = true;
    recalc = true;
    needsUpdateDefines = true;
};

function reset()
{
    arrayChangedColor = true,
    arrayChangedTrans = true;
    recalc = true;
}

function updateDefines()
{
    mod.toggleDefine("COLORIZE_INSTANCES", inColor.get());
    mod.toggleDefine("TEXCOORDS_INSTANCES", inTexCoords.get());
    mod.toggleDefine("BLEND_MODE_MULTIPLY", inBlendMode.get() === "Multiply");
    mod.toggleDefine("BLEND_MODE_ADD", inBlendMode.get() === "Add");
    mod.toggleDefine("BLEND_MODE_NONE", inBlendMode.get() === "Normal");
    needsUpdateDefines = false;
}

geom.onChange = function ()
{
    if (mesh)mesh.dispose();
    if (!geom.get())
    {
        mesh = null;
        return;
    }
    mesh = new CGL.Mesh(cgl, geom.get());
    reset();
};

function removeModule()
{

}

function setupArray()
{
    if (!mesh) return;

    let transforms = inTranslates.get();
    if (!transforms) transforms = [0, 0, 0];

    num = Math.floor(transforms.length / 3);

    if (needsUpdateDefines)updateDefines();

    const colArr = inColor.get();
    const tcArr = inTexCoords.get();
    const scales = inScales.get();

    // shader.toggleDefine("COLORIZE_INSTANCES", colArr);

    if (matrixArray.length != num * 16) matrixArray = new Float32Array(num * 16);
    if (instColorArray.length != num * 4)
    {
        arrayChangedColor = true;
        instColorArray = new Float32Array(num * 4);
    }
    if (instTexcoordArray.length != num * 4)
    {
        arrayChangedTexcoords = true;
        instTexcoordArray = new Float32Array(num * 4);
    }

    const rotArr = inRot.get();

    const useQuats = inRotMeth.get() == "Quaternions";

    for (let i = 0; i < num; i++)
    {
        mat4.identity(m);

        mat4.translate(m, m,
            [
                transforms[i * 3],
                transforms[i * 3 + 1],
                transforms[i * 3 + 2]
            ]);

        if (rotArr)
        {
            if (useQuats)
            {
                const mq = mat4.create();
                mat4.fromQuat(mq, [rotArr[i * 4 + 0], rotArr[i * 4 + 1], rotArr[i * 4 + 2], rotArr[i * 4 + 3]]);
                mat4.mul(m, m, mq);
            }
            else
            {
                mat4.rotateX(m, m, rotArr[i * 3 + 0] * CGL.DEG2RAD);
                mat4.rotateY(m, m, rotArr[i * 3 + 1] * CGL.DEG2RAD);
                mat4.rotateZ(m, m, rotArr[i * 3 + 2] * CGL.DEG2RAD);
            }
        }

        if (arrayChangedColor && colArr)
        {
            instColorArray[i * 4 + 0] = colArr[i * 4 + 0];
            instColorArray[i * 4 + 1] = colArr[i * 4 + 1];
            instColorArray[i * 4 + 2] = colArr[i * 4 + 2];
            instColorArray[i * 4 + 3] = colArr[i * 4 + 3];
        }

        if (arrayChangedTexcoords && tcArr)
        {
            instTexcoordArray[i * 4 + 0] = tcArr[i * 4 + 0];
            instTexcoordArray[i * 4 + 1] = tcArr[i * 4 + 1];
            instTexcoordArray[i * 4 + 2] = tcArr[i * 4 + 2];
            instTexcoordArray[i * 4 + 3] = tcArr[i * 4 + 3];
        }

        if (scales && scales.length > i) mat4.scale(m, m, [scales[i * 3], scales[i * 3 + 1], scales[i * 3 + 2]]);
        else mat4.scale(m, m, [1, 1, 1]);

        for (let a = 0; a < 16; a++) matrixArray[i * 16 + a] = m[a];
    }

    mesh.numInstances = num;

    if (arrayChangedTrans) mesh.addAttribute("instMat", matrixArray, 16);
    if (arrayChangedColor) mesh.addAttribute("instColor", instColorArray, 4, { "instanced": true });
    if (arrayChangedTexcoords) mesh.addAttribute("instTexCoords", instTexcoordArray, 4, { "instanced": true });

    mod.toggleDefine("HAS_TEXCOORDS", tcArr);
    mod.toggleDefine("HAS_COLORS", colArr);

    arrayChangedColor = false;
    recalc = false;
}

function updateLimit()
{
    inLimit.setUiAttribs({ "hidePort": !doLimit.get(), "greyout": !doLimit.get() });
}

function doRender()
{
    if (!mesh) return;
    if (recalc) setupArray();

    mod.bind();

    if (doLimit.get()) mesh.numInstances = Math.min(num, inLimit.get());
    else mesh.numInstances = num;

    outNum.set(mesh.numInstances);

    if (mesh.numInstances > 0) mesh.render(cgl.getShader());

    outTrigger.trigger();

    mod.unbind();
}


};

Ops.Gl.MeshInstancer_v4.prototype = new CABLES.Op();
CABLES.OPS["322d8c8d-851b-481d-9bee-ec1cf7d57a35"]={f:Ops.Gl.MeshInstancer_v4,objName:"Ops.Gl.MeshInstancer_v4"};




// **************************************************************
// 
// Ops.Points.PointsPlane_v2
// 
// **************************************************************

Ops.Points.PointsPlane_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inNumX = op.inValueInt("Rows", 32),
    inNumY = op.inValueInt("Columns", 32),
    inHeight = op.inFloat("Width", 2),
    inWidth = op.inFloat("Height", 2),
    inRowOffset = op.inFloat("Row Offset", 0),
    inCenter = op.inValueBool("Center", true),
    outArr = op.outArray("Result", [], 3),
    outTotalPoints = op.outNumber("Total points"),
    outArrayLength = op.outNumber("Array length"),
    outRowNums = op.outArray("Row Numbers", [], 1),
    outColNums = op.outArray("Column Numbers", [], 1);

inNumX.onChange =
inNumY.onChange =
inCenter.onChange =
inWidth.onChange =
inRowOffset.onChange =
inHeight.onChange = generate;

const arr = [];
const arrRowNums = [];
const arrColNums = [];
outArr.set(arr);
generate();

function generate()
{
    arr.length = 0;
    const numX = Math.max(0, inNumX.get());
    const numY = Math.max(0, inNumY.get());

    let stepX = 0;
    let stepY = 0;

    // to avoid divide by zero
    if (numX == 1)
    {
        stepX = inWidth.get() / (numX);
    }
    else
    {
        stepX = inWidth.get() / (numX - 1);
    }
    if (numY == 1)
    {
        stepY = inHeight.get() / (numY);
    }
    else
    {
        stepY = inHeight.get() / (numY - 1);
    }

    let i = 0;

    let centerX = 0;
    let centerY = 0;

    if (inCenter.get())
    {
        centerX = inWidth.get() / 2;
        centerY = inHeight.get() / 2;
    }

    const l = Math.floor(numX) * Math.floor(numY) * 3;

    arr.length = l;
    arrColNums.length = l / 3;
    arrRowNums.length = l / 3;

    let offRow = inRowOffset.get();
    let off = 0;
    for (let y = 0; y < numY; y++)
    {
        for (let x = 0; x < numX; x++)
        {
            off = 0;
            if (x % 2 == 0 && offRow)off = offRow;

            arrColNums[i / 3] = y;
            arrRowNums[i / 3] = x;

            arr[i++] = stepY * y - centerY + off;
            arr[i++] = stepX * x - centerX;

            arr[i++] = 0;
        }
    }

    outRowNums.set(null);
    outRowNums.set(arrRowNums);

    outColNums.set(null);
    outColNums.set(arrColNums);

    outArr.set(null);
    outArr.set(arr);
    outTotalPoints.set(arr.length / 3);
    outArrayLength.set(arr.length);
}


};

Ops.Points.PointsPlane_v2.prototype = new CABLES.Op();
CABLES.OPS["d453f898-17d4-4e2c-b8c7-7b7b34c0ff68"]={f:Ops.Points.PointsPlane_v2,objName:"Ops.Points.PointsPlane_v2"};




// **************************************************************
// 
// Ops.Array.ArrayUnpack3
// 
// **************************************************************

Ops.Array.ArrayUnpack3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const inArray1=op.inArray("Array in xyz"),
    outArray1=op.outArray("Array 1 out"),
    outArray2=op.outArray("Array 2 out"),
    outArray3=op.outArray("Array 3 out"),
    outArrayLength = op.outNumber("Array lengths");

var showingError = false;

const arr1=[];
const arr2=[];
const arr3=[];

inArray1.onChange = update;

function update()
{
    var array1=inArray1.get();

    if(!array1)
    {
        outArray1.set(null);
        return;
    }

    if(array1.length % 3 !== 0)
    {
        if(!showingError)
        {
            op.uiAttr({error:"Arrays length not divisible by 3 !"});
            outArrayLength.set(0);
            showingError = true;
        }
        return;
    }

    if(showingError)
    {
        showingError = false;
        op.uiAttr({error:null});
    }

    arr1.length = Math.floor(array1.length/3);
    arr2.length = Math.floor(array1.length/3);
    arr3.length = Math.floor(array1.length/3);

    for(var i=0;i<array1.length/3;i++)
    {
        arr1[i] = array1[i*3];
        arr2[i] = array1[i*3+1];
        arr3[i] = array1[i*3+2];
    }

    outArray1.set(null);
    outArray2.set(null);
    outArray3.set(null);
    outArray1.set(arr1);
    outArray2.set(arr2);
    outArray3.set(arr3);
    outArrayLength.set(arr1.length);
}



};

Ops.Array.ArrayUnpack3.prototype = new CABLES.Op();
CABLES.OPS["fa671f66-6957-41e6-ac35-d615b7c29285"]={f:Ops.Array.ArrayUnpack3,objName:"Ops.Array.ArrayUnpack3"};




// **************************************************************
// 
// Ops.Array.ArrayPack3
// 
// **************************************************************

Ops.Array.ArrayPack3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const exe = op.inTrigger("Trigger in"),
    inArr1 = op.inArray("Array 1"),
    inArr2 = op.inArray("Array 2"),
    inArr3 = op.inArray("Array 3"),
    exeOut = op.outTrigger("Trigger out"),
    outArr = op.outArray("Array out"),
    outNum = op.outNumber("Num Points"),
    outArrayLength = op.outNumber("Array length");

let showingError = false;

let arr = [];
let emptyArray = [];
let needsCalc = true;

exe.onTriggered = update;

inArr1.onChange = inArr2.onChange = inArr3.onChange = calcLater;

function calcLater()
{
    needsCalc = true;
}

function update()
{
    let array1 = inArr1.get();
    let array2 = inArr2.get();
    let array3 = inArr3.get();

    if (!array1 && !array2 && !array3)
    {
        outArr.set(null);
        outNum.set(0);
        return;
    }
    // only update if array has changed
    if (needsCalc)
    {
        let arrlen = 0;

        if (!array1 || !array2 || !array3)
        {
            if (array1) arrlen = array1.length;
            else if (array2) arrlen = array2.length;
            else if (array3) arrlen = array3.length;

            if (emptyArray.length != arrlen)
                for (var i = 0; i < arrlen; i++) emptyArray[i] = 0;

            if (!array1)array1 = emptyArray;
            if (!array2)array2 = emptyArray;
            if (!array3)array3 = emptyArray;
        }

        if ((array1.length !== array2.length) || (array2.length !== array3.length))
        {
            op.setUiError("arraylen", "Arrays do not have the same length !");
            return;
        }
        op.setUiError("arraylen", null);

        arr.length = array1.length;
        for (var i = 0; i < array1.length; i++)
        {
            arr[i * 3 + 0] = array1[i];
            arr[i * 3 + 1] = array2[i];
            arr[i * 3 + 2] = array3[i];
        }

        needsCalc = false;
        outArr.set(null);
        outArr.set(arr);
        outNum.set(arr.length / 3);
        outArrayLength.set(arr.length);
    }

    exeOut.trigger();
}


};

Ops.Array.ArrayPack3.prototype = new CABLES.Op();
CABLES.OPS["2bcf32fe-3cbd-48fd-825a-61255bebda9b"]={f:Ops.Array.ArrayPack3,objName:"Ops.Array.ArrayPack3"};




// **************************************************************
// 
// Ops.Array.RandomNumbersArray_v3
// 
// **************************************************************

Ops.Array.RandomNumbersArray_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    numValues = op.inValueInt("numValues", 10),
    min = op.inValueFloat("Min", 0),
    max = op.inValueFloat("Max", 1),
    seed = op.inValueFloat("random seed"),
    values = op.outArray("values", 100),
    outArrayLength = op.outNumber("Array length"),
    inInteger = op.inValueBool("Integer", false);

values.ignoreValueSerialize = true;
op.setPortGroup("Value Range", [min, max]);
op.setPortGroup("", [seed]);

max.onChange =
    min.onChange =
    numValues.onChange =
    seed.onChange =
    values.onLinkChanged =
    inInteger.onChange = init;

let arr = [];
init();

function init()
{
    Math.randomSeed = seed.get();
    let isInteger = inInteger.get();

    let arrLength = arr.length = Math.max(0, Math.abs(parseInt(numValues.get() || 0)));

    let minIn = min.get();
    let maxIn = max.get();

    if (arrLength === 0)
    {
        values.set(null);
        outArrayLength.set(0);
        return;
    }
    if (!isInteger)
    {
        for (var i = 0; i < arrLength; i++)
        {
            arr[i] = Math.seededRandom() * (maxIn - minIn) + minIn;
        }
    }
    else
    {
        for (var i = 0; i < arrLength; i++)
        {
            arr[i] = Math.floor(Math.seededRandom() * ((maxIn - minIn) + 1) + minIn);
        }
    }

    values.set(null);
    values.set(arr);
    outArrayLength.set(arrLength);
}


};

Ops.Array.RandomNumbersArray_v3.prototype = new CABLES.Op();
CABLES.OPS["e8609213-0803-4338-ab20-f95d0d65a110"]={f:Ops.Array.RandomNumbersArray_v3,objName:"Ops.Array.RandomNumbersArray_v3"};




// **************************************************************
// 
// Ops.Array.RandomNumbersArray3_v2
// 
// **************************************************************

Ops.Array.RandomNumbersArray3_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    numValues = op.inValueInt("numValues", 100),
    min = op.inValueFloat("Min", -1),
    max = op.inValueFloat("Max", 1),
    seed = op.inValueFloat("random seed"),
    closed = op.inValueBool("Last == First"),
    inInteger = op.inValueBool("Integer", false),
    values = op.outArray("values", null, 3),
    outTotalPoints = op.outNumber("Total points"),
    outArrayLength = op.outNumber("Array length");

op.setPortGroup("Value Range", [min, max]);
op.setPortGroup("", [seed, closed]);

values.ignoreValueSerialize = true;

closed.onChange = max.onChange =
    min.onChange =
    numValues.onChange =
    seed.onChange =
    inInteger.onChange = init;

const arr = [];
init();

function init()
{
    Math.randomSeed = seed.get();

    const isInteger = inInteger.get();

    const arrLength = arr.length = Math.max(0, Math.floor(Math.abs((numValues.get() || 0) * 3)));

    if (arrLength === 0)
    {
        values.set(null);
        outTotalPoints.set(0);
        outArrayLength.set(0);
        return;
    }

    const minIn = min.get();
    const maxIn = max.get();

    for (let i = 0; i < arrLength; i += 3)
    {
        if (!isInteger)
        {
            arr[i + 0] = Math.seededRandom() * (maxIn - minIn) + minIn;
            arr[i + 1] = Math.seededRandom() * (maxIn - minIn) + minIn;
            arr[i + 2] = Math.seededRandom() * (maxIn - minIn) + minIn;
        }
        else
        {
            arr[i + 0] = Math.floor(Math.seededRandom() * ((maxIn - minIn) + 1) + minIn);
            arr[i + 1] = Math.floor(Math.seededRandom() * ((maxIn - minIn) + 1) + minIn);
            arr[i + 2] = Math.floor(Math.seededRandom() * ((maxIn - minIn) + 1) + minIn);
        }
    }

    if (closed.get() && arrLength > 3)
    {
        arr[arrLength - 3 + 0] = arr[0];
        arr[arrLength - 3 + 1] = arr[1];
        arr[arrLength - 3 + 2] = arr[2];
    }

    values.set(null);
    values.set(arr);
    outTotalPoints.set(arrLength / 3);
    outArrayLength.set(arrLength);
}


};

Ops.Array.RandomNumbersArray3_v2.prototype = new CABLES.Op();
CABLES.OPS["45b2113a-1ca0-41d8-8d90-db3e394b669c"]={f:Ops.Array.RandomNumbersArray3_v2,objName:"Ops.Array.RandomNumbersArray3_v2"};




// **************************************************************
// 
// Ops.Trigger.TriggerExtender
// 
// **************************************************************

Ops.Trigger.TriggerExtender = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
// inputs
var inTriggerPort = op.inTriggerButton('Execute');

// outputs
var outTriggerPort = op.outTrigger('Next');

// trigger listener
inTriggerPort.onTriggered = function() {
    outTriggerPort.trigger();
};

};

Ops.Trigger.TriggerExtender.prototype = new CABLES.Op();
CABLES.OPS["7ef594f3-4907-47b0-a2d3-9854eda1679d"]={f:Ops.Trigger.TriggerExtender,objName:"Ops.Trigger.TriggerExtender"};




// **************************************************************
// 
// Ops.Math.Divide
// 
// **************************************************************

Ops.Math.Divide = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    number1 = op.inValueFloat("number1",1),
    number2 = op.inValueFloat("number2",2),
    result = op.outValue("result");

number1.onChange=number2.onChange=exec;
exec();

function exec()
{
    result.set( number1.get() / number2.get() );
}



};

Ops.Math.Divide.prototype = new CABLES.Op();
CABLES.OPS["86fcfd8c-038d-4b91-9820-a08114f6b7eb"]={f:Ops.Math.Divide,objName:"Ops.Math.Divide"};




// **************************************************************
// 
// Ops.Math.Pow
// 
// **************************************************************

Ops.Math.Pow = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const base=op.inValueFloat("Base");
const exponent=op.inValueFloat("Exponent");
const result=op.outValue("Result");

exponent.set(2);

base.onChange=update;
exponent.onChange=update;

function update()
{
    let r=Math.pow( base.get(), exponent.get() );
    if(isNaN(r))r=0;
    result.set(r);
}

};

Ops.Math.Pow.prototype = new CABLES.Op();
CABLES.OPS["3bb3f98f-27d6-44c4-b4e5-186e10f0809d"]={f:Ops.Math.Pow,objName:"Ops.Math.Pow"};




// **************************************************************
// 
// Ops.Gl.ShaderEffects.ColorArea_v3
// 
// **************************************************************

Ops.Gl.ShaderEffects.ColorArea_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={colorarea_frag:"\n\n#ifdef MOD_AREA_SPHERE\n    float MOD_de=distance(\n        MOD_pos,\n        vec3(MOD_vertPos.x*MOD_inSizeAmountFalloffSizeX.w,MOD_vertPos.y,MOD_vertPos.z)\n        );\n#endif\n\n#ifdef MOD_AREA_BOX\n    float MOD_de=0.0;\n    if(abs(MOD_vertPos.y-MOD_pos.y)>MOD_inSizeAmountFalloffSizeX.x ||\n        abs(MOD_vertPos.x-MOD_pos.x)>MOD_inSizeAmountFalloffSizeX.x ||\n        abs(MOD_vertPos.z-MOD_pos.z)>MOD_inSizeAmountFalloffSizeX.x ) MOD_de=1.0;\n\n\n\n\n#endif\n\n#ifdef MOD_AREA_AXIS_X\n    float MOD_de=abs(MOD_pos.x-MOD_vertPos.x);\n#endif\n#ifdef MOD_AREA_AXIS_Y\n    float MOD_de=abs(MOD_pos.y-MOD_vertPos.y);\n#endif\n#ifdef MOD_AREA_AXIS_Z\n    float MOD_de=abs(MOD_pos.z-MOD_vertPos.z);\n#endif\n\n#ifdef MOD_AREA_AXIS_X_INFINITE\n    float MOD_de=MOD_pos.x-MOD_vertPos.x;\n#endif\n#ifdef MOD_AREA_AXIS_Y_INFINITE\n    float MOD_de=MOD_pos.y-MOD_vertPos.y;\n#endif\n#ifdef MOD_AREA_AXIS_Z_INFINITE\n    float MOD_de=MOD_pos.z-MOD_vertPos.z;\n#endif\n\n#ifndef MOD_AREA_BOX\n    MOD_de=1.0-smoothstep(MOD_inSizeAmountFalloffSizeX.z*MOD_inSizeAmountFalloffSizeX.x,MOD_inSizeAmountFalloffSizeX.x,MOD_de);\n#endif\n\n#ifdef MOD_AREA_INVERT\n    MOD_de=1.0-MOD_de;\n#endif\n\n#ifdef MOD_BLEND_NORMAL\n    col.rgb=mix(col.rgb,MOD_color, MOD_de*MOD_inSizeAmountFalloffSizeX.y);\n#endif\n\n\n#ifdef MOD_BLEND_MULTIPLY\n    col.rgb=mix(col.rgb,col.rgb*MOD_color,MOD_de*MOD_inSizeAmountFalloffSizeX.y);\n#endif\n\n#ifdef MOD_BLEND_ADD\n    col.rgb+=MOD_de*MOD_inSizeAmountFalloffSizeX.y*MOD_color;\n#endif\n\n\n#ifdef MOD_BLEND_OPACITY\n    col.a*=(1.0-MOD_de*MOD_inSizeAmountFalloffSizeX.y);\n#endif\n\n#ifdef MOD_BLEND_DISCARD\n    if(MOD_de*MOD_inSizeAmountFalloffSizeX.y>=0.999)discard;\n#endif\n\n// col.rgb=vec3(distance(MOD_vertPos.xyz,MOD_pos.xyz))*0.1\n// col.rgb=MOD_pos.xyz;",colorarea_head_frag:"IN vec4 MOD_vertPos;\n",};
const
    render = op.inTrigger("Render"),
    inArea = op.inValueSelect("Area", ["Sphere", "Box", "Axis X", "Axis Y", "Axis Z", "Axis X Infinite", "Axis Y Infinite", "Axis Z Infinite"], "Sphere"),
    inSize = op.inValue("Size", 1),
    inAmount = op.inValueSlider("Amount", 0.5),
    inFalloff = op.inValueSlider("Falloff", 0),
    inInvert = op.inValueBool("Invert"),
    inBlend = op.inSwitch("Blend ", ["Normal", "Multiply", "Opacity", "Add", "Discard"], "Normal"),
    r = op.inValueSlider("r", Math.random()),
    g = op.inValueSlider("g", Math.random()),
    b = op.inValueSlider("b", Math.random()),
    x = op.inValue("x"),
    y = op.inValue("y"),
    z = op.inValue("z"),
    sizeX = op.inValueSlider("Size X", 1),
    inWorldSpace = op.inValueBool("WorldSpace", true),
    // inPosAbs = op.inValueBool("Position Absolute", true),
    inPrio = op.inBool("Priority", true),
    next = op.outTrigger("Next");

op.setPortGroup("Position", [x, y, z]);
op.setPortGroup("Color", [inBlend, r, g, b]);
r.setUiAttribs({ "colorPick": true });

const cgl = op.patch.cgl;

const srcHeadVert = ""
    .endl() + "OUT vec4 MOD_vertPos;"
    // .endl() + "OUT vec3 MOD_pos;"
    .endl();

const srcBodyVert = ""

// .endl() + "#ifndef MOD_POS_ABS"
// .endl() + "   MOD_pos=(mMatrix*vec4(MOD_posi,1.0)).xyz;"
// .endl() + "#endif"
// .endl() + "#ifdef MOD_POS_ABS"
// .endl() + "   MOD_pos=MOD_posi;"
// .endl() + "#endif"

    .endl() + "#ifndef MOD_WORLDSPACE"
    .endl() + "   MOD_vertPos=vec4(vPosition,1.0);"
    .endl() + "#endif"

    .endl() + "#ifdef MOD_WORLDSPACE"
    .endl() + "   MOD_vertPos=mMatrix*pos;"
    .endl() + "#endif"
    .endl();

inWorldSpace.onChange =
    inArea.onChange =
    inInvert.onChange =
    // inPosAbs.onChange =
    inBlend.onChange = updateDefines;

render.onTriggered = doRender;

const vertModTitle = "vert_" + op.name;
const mod = new CGL.ShaderModifier(cgl, op.name);
mod.addModule({
    "priority": 2,
    "title": vertModTitle,
    "name": "MODULE_VERTEX_POSITION",
    srcHeadVert,
    srcBodyVert
});

mod.addModule({
    "title": op.name,
    "name": "MODULE_COLOR",
    "srcHeadFrag": attachments.colorarea_head_frag,
    "srcBodyFrag": attachments.colorarea_frag
});

mod.addUniform("4f", "MOD_inSizeAmountFalloffSizeX", inSize, inAmount, inFalloff, sizeX);
mod.addUniform("3f", "MOD_color", r, g, b);
mod.addUniform("3f", "MOD_pos", x, y, z);
updateDefines();

inPrio.onChange = updatePrio;
updatePrio();

function updatePrio()
{
    mod.removeModule(vertModTitle);

    const vmod = {
        // "priority": 0,
        "title": vertModTitle,
        "name": "MODULE_VERTEX_POSITION",
        srcHeadVert,
        srcBodyVert
    };

    if (inPrio.get()) vmod.priority = 2;

    mod.addModule(vmod);
}

function updateDefines()
{
    mod.toggleDefine("MOD_BLEND_NORMAL", inBlend.get() == "Normal");
    mod.toggleDefine("MOD_BLEND_OPACITY", inBlend.get() == "Opacity");
    mod.toggleDefine("MOD_BLEND_MULTIPLY", inBlend.get() == "Multiply");
    mod.toggleDefine("MOD_BLEND_DISCARD", inBlend.get() == "Discard");
    mod.toggleDefine("MOD_BLEND_ADD", inBlend.get() == "Add");

    mod.toggleDefine("MOD_AREA_INVERT", inInvert.get());
    mod.toggleDefine("MOD_WORLDSPACE", inWorldSpace.get());
    // mod.toggleDefine("MOD_POS_ABS", inPosAbs.get());

    mod.toggleDefine("MOD_AREA_AXIS_X", inArea.get() == "Axis X");
    mod.toggleDefine("MOD_AREA_AXIS_Y", inArea.get() == "Axis Y");
    mod.toggleDefine("MOD_AREA_AXIS_Z", inArea.get() == "Axis Z");
    mod.toggleDefine("MOD_AREA_AXIS_X_INFINITE", inArea.get() == "Axis X Infinite");
    mod.toggleDefine("MOD_AREA_AXIS_Y_INFINITE", inArea.get() == "Axis Y Infinite");
    mod.toggleDefine("MOD_AREA_AXIS_Z_INFINITE", inArea.get() == "Axis Z Infinite");
    mod.toggleDefine("MOD_AREA_SPHERE", inArea.get() == "Sphere");
    mod.toggleDefine("MOD_AREA_BOX", inArea.get() == "Box");
}

function drawHelpers()
{
    if (cgl.frameStore.shadowPass) return;
    if (cgl.shouldDrawHelpers(op)) gui.setTransformGizmo({ "posX": x, "posY": y, "posZ": z });
}

function doRender()
{
    mod.bind();
    drawHelpers();
    next.trigger();

    mod.unbind();
}


};

Ops.Gl.ShaderEffects.ColorArea_v3.prototype = new CABLES.Op();
CABLES.OPS["bc46bd2b-ea86-4b74-bb2b-7613e1a1a4f3"]={f:Ops.Gl.ShaderEffects.ColorArea_v3,objName:"Ops.Gl.ShaderEffects.ColorArea_v3"};




// **************************************************************
// 
// Ops.Gl.Meshes.Sphere_v2
// 
// **************************************************************

Ops.Gl.Meshes.Sphere_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    TAU = Math.PI * 2,
    cgl = op.patch.cgl,
    inTrigger = op.inTrigger("render"),
    inRadius = op.inValue("radius", 1),
    inStacks = op.inValue("stacks", 32),
    inSlices = op.inValue("slices", 32),
    inStacklimit = op.inValueSlider("Filloffset", 1),
    inDraw = op.inValueBool("Render", true),
    outTrigger = op.outTrigger("trigger"),
    outGeometry = op.outObject("geometry", null, "geometry"),
    UP = vec3.fromValues(0, 1, 0),
    RIGHT = vec3.fromValues(1, 0, 0);
let
    geom = new CGL.Geometry("Sphere"),
    tmpNormal = vec3.create(),
    tmpVec = vec3.create(),
    needsRebuild = true,
    mesh;
function buildMesh()
{
    const
        stacks = Math.max(inStacks.get(), 2),
        slices = Math.max(inSlices.get(), 3),
        stackLimit = Math.min(Math.max(inStacklimit.get() * stacks, 1), stacks),
        radius = inRadius.get();
    let
        positions = [],
        texcoords = [],
        normals = [],
        tangents = [],
        biTangents = [],
        indices = [],
        x, y, z, d, t, a,
        o, u, v, i, j;
    for (i = o = 0; i < stacks + 1; i++)
    {
        v = (i / stacks - 0.5) * Math.PI;
        y = Math.sin(v);
        a = Math.cos(v);
        // for (j = 0; j < slices+1; j++) {
        for (j = slices; j >= 0; j--)
        {
            u = (j / slices) * TAU;
            x = Math.cos(u) * a;
            z = Math.sin(u) * a;

            positions.push(x * radius, y * radius, z * radius);
            // texcoords.push(i/(stacks+1),j/slices);
            texcoords.push(j / slices, i / (stacks + 1));

            d = Math.sqrt(x * x + y * y + z * z);
            normals.push(
                tmpNormal[0] = x / d,
                tmpNormal[1] = y / d,
                tmpNormal[2] = z / d
            );

            if (y == d) t = RIGHT;
            else t = UP;
            vec3.cross(tmpVec, tmpNormal, t);
            vec3.normalize(tmpVec, tmpVec);
            Array.prototype.push.apply(tangents, tmpVec);
            vec3.cross(tmpVec, tmpVec, tmpNormal);
            Array.prototype.push.apply(biTangents, tmpVec);
        }
        if (i == 0 || i > stackLimit) continue;
        for (j = 0; j < slices; j++, o++)
        {
            indices.push(
                o, o + 1, o + slices + 1,
                o + 1, o + slices + 2, o + slices + 1
            );
        }
        o++;
    }

    // set geometry
    geom.clear();
    geom.vertices = positions;
    geom.texCoords = texcoords;
    geom.vertexNormals = normals;
    geom.tangents = tangents;
    geom.biTangents = biTangents;
    geom.verticesIndices = indices;

    outGeometry.set(null);
    outGeometry.set(geom);

    if (!mesh) mesh = new CGL.Mesh(cgl, geom);
    else mesh.setGeom(geom);

    needsRebuild = false;
}

// set event handlers
inTrigger.onTriggered = function ()
{
    if (needsRebuild) buildMesh();
    if (inDraw.get()) mesh.render(cgl.getShader());
    outTrigger.trigger();
};

inStacks.onChange =
inSlices.onChange =
inStacklimit.onChange =
inRadius.onChange = function ()
{
    // only calculate once, even after multiple settings could were changed
    needsRebuild = true;
};

// set lifecycle handlers
op.onDelete = function () { if (mesh)mesh.dispose(); };


};

Ops.Gl.Meshes.Sphere_v2.prototype = new CABLES.Op();
CABLES.OPS["450b4d68-2278-4d9f-9849-0abdfa37ef69"]={f:Ops.Gl.Meshes.Sphere_v2,objName:"Ops.Gl.Meshes.Sphere_v2"};




// **************************************************************
// 
// Ops.Math.Sine
// 
// **************************************************************

Ops.Math.Sine = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
// input
let value = op.inValue("value");

let phase = op.inValue("phase", 0.0);
let mul = op.inValue("frequency", 1.0);
let amplitude = op.inValue("amplitude", 1.0);
let invert = op.inValueBool("asine", false);

// output
let result = op.outValue("result");

let calculate = Math.sin;

phase.onChange =
value.onChange = function ()
{
    result.set(
        amplitude.get() * calculate((value.get() * mul.get()) + phase.get())
    );
};

invert.onChange = function ()
{
    if (invert.get()) calculate = Math.asin;
    else calculate = Math.sin;
};


};

Ops.Math.Sine.prototype = new CABLES.Op();
CABLES.OPS["d24da018-9f3d-428b-85c9-6ff14d77548b"]={f:Ops.Math.Sine,objName:"Ops.Math.Sine"};




// **************************************************************
// 
// Ops.Math.Ease
// 
// **************************************************************

Ops.Math.Ease = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inVal=op.inValue("Value"),
    inMin=op.inValue("Min",0),
    inMax=op.inValue("Max",1),
    result=op.outValue("Result"),
    anim=new CABLES.Anim();

anim.createPort(op,"Easing",updateAnimEasing);
anim.setValue(0,0);
anim.setValue(1,1);

op.onLoaded=inMin.onChange=inMax.onChange=updateMinMax;

function updateMinMax()
{
    anim.keys[0].time=anim.keys[0].value=Math.min(inMin.get(),inMax.get());
    anim.keys[1].time=anim.keys[1].value=Math.max(inMin.get(),inMax.get());
}

function updateAnimEasing()
{
    anim.keys[0].setEasing(anim.defaultEasing);
}

inVal.onChange=function()
{
    const r=anim.getValue(inVal.get());
    result.set(r);
};

};

Ops.Math.Ease.prototype = new CABLES.Op();
CABLES.OPS["8f6e4a08-33e6-408f-ac4a-198bd03b417b"]={f:Ops.Math.Ease,objName:"Ops.Math.Ease"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.SSAO
// 
// **************************************************************

Ops.Gl.TextureEffects.SSAO = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={ssao_frag:"/*\nSSAO GLSL shader v1.2\nassembled by Martins Upitis (martinsh) (devlog-martinsh.blogspot.com)\noriginal technique is made by Arkano22 (www.gamedev.net/topic/550699-ssao-no-halo-artifacts/)\n\nchangelog:\n1.2 - added fog calculation to mask AO. Minor fixes.\n1.1 - added spiral sampling method from here:\n(http://www.cgafaq.info/wiki/Evenly_distributed_points_on_sphere)\n\n*/\n\nIN vec2 texCoord;\n\nUNI sampler2D texDepth;\nUNI sampler2D tex;\n// const float bgl_RenderedTextureWidth=800.0;\n// const float bgl_RenderedTextureHeight=600.0;\n\n#define PI    3.14159265\n\nUNI float width;\nUNI float height;\n// float width = 800.0; //texture width\n// float height = 600.0; //texture height\n\n// vec2 texCoord = texCoord.st;\n\n//------------------------------------------\n//general stuff\n\n//make sure that these two values are the same for your camera, otherwise distances will be wrong.\n\n// const float znear = 0.01; //Z-near\n// const float zfar = 20.0; //Z-far\nUNI float znear;\nUNI float zfar;\n\n//user variables\n// const int SAMPLES = 16; //ao sample count\n// UNI int SAMPLES;\n\n// const float radius = 3.0; //ao radius\n// const float aoclamp = 0.25; //depth clamp - reduces haloing at screen edges\n\nUNI float radius;\nUNI float aoclamp;\nUNI bool noise ; //use noise instead of pattern for sample dithering//*****\nUNI float noiseamount; //dithering amount//********\n\nconst float diffarea = 0.4; //self-shadowing reduction\nconst float gdisplace = 0.4; //gauss bell center\n\n// const bool mist = false; //use mist?\n// const float miststart = 0.0; //mist start\n// const float mistend = 16.0; //mist end\n\n// const bool onlyAO = false; //use only ambient occlusion pass?\n// const float lumInfluence = 0.7; //how much luminance affects occlusion\nUNI float lumInfluence;\n\n//--------------------------------------------------------\n\nvec2 rand(vec2 coord) //generating noise/pattern texture for dithering\n{\n\n    #ifndef NOISE\n    \treturn vec2(0.0,0.0);\n\t#endif\n\n    #ifdef NOISE\n\t\tfloat noiseX = clamp(fract(sin(dot(coord ,vec2(12.9898,78.233))) * 43758.5453),0.0,1.0)*2.0-1.0;\n\t\tfloat noiseY = clamp(fract(sin(dot(coord ,vec2(12.9898,78.233)*2.0)) * 43758.5453),0.0,1.0)*2.0-1.0;\n    \treturn vec2(noiseX,noiseY)*noiseamount/100.0;\n    #endif\n}\n\n// float doMist()\n// {\n// \tfloat zdepth = texture(texDepth,texCoord.xy).x;\n// \tfloat depth = -zfar * znear / (zdepth * (zfar - znear) - zfar);\n// \treturn clamp((depth-miststart)/mistend,0.0,1.0);\n// }\n\nfloat readDepth(in vec2 coord)\n{\n\tif (texCoord.x<0.0||texCoord.y<0.0) return 1.0;\n\treturn (2.0 * znear) / (zfar + znear - texture(texDepth, coord ).x * (zfar-znear));\n}\n\nfloat compareDepths(in float depth1, in float depth2,inout int far)\n{\n\tfloat garea = 2.0; //gauss bell width\n\tfloat diff = (depth1 - depth2)*100.0; //depth difference (0-100)\n\t//reduce left bell width to avoid self-shadowing\n\tif (diff<gdisplace)\n\t{\n\tgarea = diffarea;\n\t}else{\n\tfar = 1;\n\t}\n\n\tfloat gauss = pow(2.7182,-2.0*(diff-gdisplace)*(diff-gdisplace)/(garea*garea));\n\treturn gauss;\n}\n\nfloat calAO(float depth,float dw, float dh)\n{\n\tfloat dd = (1.0-depth)*radius;\n\n\tfloat temp = 0.0;\n\tfloat temp2 = 0.0;\n\tfloat coordw = texCoord.x + dw*dd;\n\tfloat coordh = texCoord.y + dh*dd;\n\tfloat coordw2 = texCoord.x - dw*dd;\n\tfloat coordh2 = texCoord.y - dh*dd;\n\n\tvec2 coord = vec2(coordw , coordh);\n\tvec2 coord2 = vec2(coordw2, coordh2);\n\n\tint far = 0;\n\ttemp = compareDepths(depth, readDepth(coord),far);\n\t//DEPTH EXTRAPOLATION:\n\tif (far > 0)\n\t{\n\t\ttemp2 = compareDepths(readDepth(coord2),depth,far);\n\t\ttemp += (1.0-temp)*temp2;\n\t}\n\n\treturn temp;\n}\n\nvoid main(void)\n{\n\tvec2 noise = rand(texCoord);\n\tfloat depth = readDepth(texCoord);\n\n\tfloat w = (1.0 / width)/clamp(depth,aoclamp,1.0)+(noise.x*(1.0-noise.x));\n\tfloat h = (1.0 / height)/clamp(depth,aoclamp,1.0)+(noise.y*(1.0-noise.y));\n\n\tfloat pw;\n\tfloat ph;\n\n\tfloat ao;\n\n\tfloat dl = PI*(3.0-sqrt(5.0));\n\tfloat dz = 1.0/float(SAMPLES);\n\tfloat l = 0.0;\n\tfloat z = 1.0 - dz/2.0;\n\n\tfor (int i = 0; i <= SAMPLES; i ++)\n\t{\n\t\tfloat r = sqrt(1.0-z);\n\n\t\tpw = cos(l)*r;\n\t\tph = sin(l)*r;\n\t\tao += calAO(depth,pw*w,ph*h);\n\t\tz = z - dz;\n\t\tl = l + dl;\n\t}\n\n\tao /= float(SAMPLES);\n\tao = 1.0-ao;\n\n// \tif (mist)\n// \t{\n// \tao = mix(ao, 1.0,doMist());\n// \t}\n\n\tvec3 color = texture(tex,texCoord).rgb;\n\n\tvec3 lumcoeff = vec3(0.299,0.587,0.114);\n\tfloat lum = dot(color.rgb, lumcoeff);\n\tvec3 luminance = vec3(lum, lum, lum);\n\n\tvec3 final = vec3(color*mix(vec3(ao),vec3(1.0),luminance*lumInfluence));//mix(color*ao, white, luminance)\n\n// \tif (onlyAO)\n// \t{\n// \tfinal = vec3(mix(vec3(ao),vec3(1.0),luminance*lumInfluence)); //ambient occlusion only\n// \t}\n\n\n\toutColor= vec4(final,1.0);\n\n}",};
const
    render = op.inTrigger("render"),
    trigger = op.outTrigger("trigger"),
    depth = op.inTexture("depth texture"),
    zNear = op.inValue("Frustum Near", 0.1),
    zFar = op.inValue("Frustum Far", 20),
    samples = op.inValueInt("Samples", 4),
    aoRadius = op.inValue("Ao Radius", 3),
    aoClamp = op.inValueSlider("Ao Clamp", 0.25),
    lumInfluence = op.inValueSlider("Luminance Influence", 0.7),
    noise = op.inValueBool("Enable noise", false),
    noiseamount = op.inValueFloat("Noise amount", 0.0008);

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, op.name);

shader.setSource(shader.getDefaultVertexShader(), attachments.ssao_frag);
let textureUniform = new CGL.Uniform(shader, "t", "tex", 0);
let textureAlpha = new CGL.Uniform(shader, "t", "texDepth", 1);

aoRadius.uniform = new CGL.Uniform(shader, "f", "radius", aoRadius);
aoClamp.uniform = new CGL.Uniform(shader, "f", "aoclamp", aoClamp);
lumInfluence.uniform = new CGL.Uniform(shader, "f", "lumInfluence", lumInfluence);
// samples.uniform=new CGL.Uniform(shader,'i','samples',samples);

zNear.uniform = new CGL.Uniform(shader, "f", "znear", zNear);
zFar.uniform = new CGL.Uniform(shader, "f", "zfar", zFar);

noiseamount.uniform = new CGL.Uniform(shader, "f", "noiseamount", noiseamount);

noise.onChange = function ()
{
    shader.toggleDefine("NOISE", noise.get());
};

samples.onChange = function ()
{
    shader.define("SAMPLES", samples.get());
};

let uniWidth = new CGL.Uniform(shader, "f", "width", 1024);
let uniHeight = new CGL.Uniform(shader, "f", "height", 512);

shader.define("SAMPLES", samples.get());
aoClamp.uniform = new CGL.Uniform(shader, "f", "aoclamp", aoClamp);

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;
    if (!depth.get()) return;

    uniWidth.setValue(depth.get().width);
    uniHeight.setValue(depth.get().height);

    cgl.pushShader(shader);

    cgl.currentTextureEffect.bind();
    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

    if (depth.get() && depth.get().tex)
    {
        cgl.setTexture(1, depth.get().tex);
        // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, depth.get().tex );
    }

    cgl.currentTextureEffect.finish();

    cgl.popShader();
    trigger.trigger();
};


};

Ops.Gl.TextureEffects.SSAO.prototype = new CABLES.Op();
CABLES.OPS["76d2dafc-aaf9-48ca-8b24-ee18492fba80"]={f:Ops.Gl.TextureEffects.SSAO,objName:"Ops.Gl.TextureEffects.SSAO"};


window.addEventListener('load', function(event) {
CABLES.jsLoaded=new Event('CABLES.jsLoaded');
document.dispatchEvent(CABLES.jsLoaded);
});
