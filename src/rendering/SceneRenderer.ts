import * as THREE from "three";
import { ParticleField } from "../particles/ParticleField";
export class SceneRenderer {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  field: ParticleField;
  private geometry = new THREE.BufferGeometry();
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private background: THREE.Points;
  private target = new THREE.Vector3();
  private width = 1;
  private height = 1;
  constructor(canvas: HTMLCanvasElement, quality: "standard" | "low") {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x050710, 0);
    this.camera.position.set(0, 0, 10);
    this.field = new ParticleField(quality === "low" ? 4000 : 8000);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: { uTime: { value: 0 }, uRatio: { value: 1 } },
      vertexShader: `attribute float aSize; varying vec3 vColor; varying float vAlpha; uniform float uTime; uniform float uRatio; void main(){vColor=color; vAlpha=.48+.52*sin(aSize*18.+uTime*.5)*sin(aSize*18.+uTime*.5);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp((3.+aSize*7.)*uRatio*(8./-mv.z),1.,40.);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying vec3 vColor; varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float glow=exp(-r*r*5.)*.55+exp(-r*r*40.)*.8;gl_FragColor=vec4(vColor,glow*vAlpha);}`,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    const g = new THREE.BufferGeometry(),
      p = new Float32Array(500 * 3);
    for (let i = 0; i < p.length; i++)
      p[i] = (Math.random() - 0.5) * (i % 3 === 2 ? 12 : 32);
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    this.background = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: 0x536686,
        size: 0.018,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    this.background.position.z = -4;
    this.scene.add(this.background);
    this.setQuality(quality);
  }
  setQuality(quality: "standard" | "low") {
    this.field = new ParticleField(quality === "low" ? 4000 : 8000);
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.field.positions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.field.colors, 3),
    );
    this.geometry.setAttribute(
      "aSize",
      new THREE.BufferAttribute(this.field.sizes, 1),
    );
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, quality === "low" ? 1 : 1.5),
    );
    this.resize(this.width, this.height);
  }
  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.position.z = 4 / Math.tan(THREE.MathUtils.degToRad(22.5));
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.material.uniforms.uRatio.value = this.renderer.getPixelRatio();
  }
  render(time: number) {
    this.geometry.attributes.position.needsUpdate = true;
    this.material.uniforms.uTime.value = time;
    this.background.rotation.z = Math.sin(time * 0.02) * 0.02;
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.background.geometry.dispose();
    (this.background.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
