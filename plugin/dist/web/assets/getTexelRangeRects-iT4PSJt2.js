import{w as x,g as l,c as u}from"./index-mfSMJ-Bl.js";const d={name:"texture-bit",vertex:{header:`

        struct TextureUniforms {
            uTextureMatrix:mat3x3<f32>,
        }

        @group(2) @binding(2) var<uniform> textureUniforms : TextureUniforms;
        `,main:`
            uv = (textureUniforms.uTextureMatrix * vec3(uv, 1.0)).xy;
        `},fragment:{header:`
            @group(2) @binding(0) var uTexture: texture_2d<f32>;
            @group(2) @binding(1) var uSampler: sampler;


        `,main:`
            outColor = textureSample(uTexture, uSampler, vUV);
        `}},S={name:"texture-bit",vertex:{header:`
            uniform mat3 uTextureMatrix;
        `,main:`
            uv = (uTextureMatrix * vec3(uv, 1.0)).xy;
        `},fragment:{header:`
        uniform sampler2D uTexture;


        `,main:`
            outColor = texture(uTexture, vUV);
        `}};function T(s,i){for(const e in s.attributes){const r=s.attributes[e],a=i[e];a?(r.format??(r.format=a.format),r.offset??(r.offset=a.offset),r.instance??(r.instance=a.instance)):r.format||x(`Attribute ${e} is not present in the shader, but is present in the geometry. Unable to infer attribute details.`)}b(s)}function b(s){const{buffers:i,attributes:e}=s,r={},a={};for(const n in i){const t=i[n];r[t.uid]=0,a[t.uid]=0}for(const n in e){const t=e[n];r[t.buffer.uid]+=l(t.format).stride}for(const n in e){const t=e[n];t.stride??(t.stride=r[t.buffer.uid]),t.start??(t.start=a[t.buffer.uid]),a[t.buffer.uid]+=l(t.format).stride}}const o=[];o[u.NONE]=void 0;o[u.DISABLED]={stencilWriteMask:0,stencilReadMask:0};o[u.RENDERING_MASK_ADD]={stencilFront:{compare:"equal",passOp:"increment-clamp"},stencilBack:{compare:"equal",passOp:"increment-clamp"}};o[u.RENDERING_MASK_REMOVE]={stencilFront:{compare:"equal",passOp:"decrement-clamp"},stencilBack:{compare:"equal",passOp:"decrement-clamp"}};o[u.MASK_ACTIVE]={stencilWriteMask:0,stencilFront:{compare:"equal",passOp:"keep"},stencilBack:{compare:"equal",passOp:"keep"}};o[u.INVERSE_MASK_ACTIVE]={stencilWriteMask:0,stencilFront:{compare:"not-equal",passOp:"keep"},stencilBack:{compare:"not-equal",passOp:"keep"}};function v(s,i,e,r,a){if(s=Math.max(0,s),i=Math.min(i,e*r),s>=i)return 0;const n=Math.floor(s/e),t=s-n*e,c=Math.floor(i/e),p=i-c*e;if(n===c)return a[0].set(t,n,p-t,1),1;let f=0,m=n;return t>0&&(a[f++].set(t,n,e-t,1),m++),c>m&&a[f++].set(0,m,e,c-m),p>0&&a[f++].set(0,c,p,1),f}export{o as G,S as a,T as e,v as g,d as t};
