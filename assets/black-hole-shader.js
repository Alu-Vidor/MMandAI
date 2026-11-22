(() => {
  const vertexSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_mass;
    uniform float u_inclination;
    uniform float u_rays;

    mat2 rotation(float angle) {
      float c = cos(angle), s = sin(angle);
      return mat2(c, s, -s, c);
    }

    float hash(vec2 p) {
      p = fract(p * vec2(.1031, .11369));
      p += dot(p, p.yx + 19.19);
      return fract((p.x + p.y) * p.x);
    }

    float noise(vec2 p) {
      vec2 cell = floor(p), f = fract(p);
      vec2 w = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(cell), hash(cell + vec2(1, 0)), w.x),
        mix(hash(cell + vec2(0, 1)), hash(cell + vec2(1, 1)), w.x),
        w.y
      );
    }

    float gaussian(float distance, float width) {
      float z = distance / width;
      return exp(-z * z);
    }

    float stars(vec2 p, float density, float pixel) {
      vec2 uv = p * density;
      vec2 cell = floor(uv);
      float seed = hash(cell);
      vec2 center = vec2(hash(cell + 8.1), hash(cell + 24.3)) * .68 + .16;
      float spot = gaussian(length(fract(uv) - center), max(.050, density * pixel * .50));
      return spot * step(.83, seed) * mix(.12, .9, pow(seed, 11.0));
    }

    vec3 disk(vec2 p, float hole, float flatten, float pixel) {
      vec2 plane = vec2(p.x, p.y / flatten);
      float radius = length(plane);
      float inner = hole * 1.49;
      float edge = smoothstep(inner - pixel, inner + hole * .24, radius)
                 * (1.0 - smoothstep(.30, .48, radius));
      float angle = atan(plane.y, plane.x + .00001);
      float phase = angle + 7.0 * log(max(.01, radius)) + u_time * .32 / (.22 + radius);
      vec2 flow = vec2(cos(phase), sin(phase));
      float eddies = .58 * noise(flow * 7.0 + radius * 62.0)
                   + .29 * noise(flow * 16.0 + radius * 121.0)
                   + .13 * noise(flow * 37.0 + radius * 214.0);
      float filament = .5 + .5 * sin(radius * 297.0 + eddies * 8.0 + 2.0 * sin(phase * 3.0));
      float density = edge * exp(-6.2 * max(radius - inner, 0.0));
      float light = density * (.20 + eddies * .72 + pow(filament, 4.0) * .77);
      light *= .55 + 1.6 * pow(clamp(.5 - .5 * cos(angle), 0.0, 1.0), 2.2);
      vec3 cool = mix(vec3(.23,.28,.66), vec3(.25,.65,1.0), eddies);
      vec3 hot = vec3(.72,.88,1.0);
      vec3 color = mix(cool, hot, pow(clamp(light, 0.0, 1.0), 1.35));
      float sparks = smoothstep(.80,.96,noise(flow * 66.0 + radius * 530.0));
      return color * light * 1.48 + vec3(.40,.65,1.0) * sparks * density * .34;
    }

    float rayLines(vec2 p, float hole, float pixel) {
      float lines = 0.0;
      for (int i = 0; i < 5; i++) {
        float side = mod(float(i), 2.0) * 2.0 - 1.0;
        float offset = hole * (1.30 + float(i) * .28);
        float curve = offset - offset * .25 * exp(-13.0 * (p.x + .13) * (p.x + .13));
        curve += p.x * (.04 + float(i) * .008);
        lines += gaussian(p.y - side * curve, pixel * .83);
      }
      return lines * smoothstep(hole, hole * 1.27, length(p));
    }

    void main() {
      float pixel = 1.0 / u_resolution.x;
      vec2 p = (gl_FragCoord.xy - u_resolution * .5) * pixel;
      vec2 scene = rotation(.16) * p;
      float radial = length(scene);
      float hole = .060 + .00103 * (u_mass - 5.0);
      float flatten = max(.10, .64 * cos(u_inclination));
      float unmasked = smoothstep(hole - pixel, hole + pixel, radial);
      float edgeFade = 1.0 - smoothstep(.14, .26, abs(p.y));

      float nebula = noise(scene * 12.0) * noise(scene * 30.0 + 5.0);
      vec3 color = vec3(.023,.047,.091);
      color += vec3(.046,.084,.19) * gaussian(length(scene * vec2(.7, 1.3)), .38) * (.24 + nebula);
      color += vec3(.16,.23,.47) * gaussian(length(scene * vec2(.6,1.8)), .26) * nebula * .29;
      vec2 deflected = p - p * (.60 * hole * hole / max(dot(p,p), hole * hole));
      color += vec3(.63,.80,1.0) * (stars(deflected, 86.0, pixel) * .56 + stars(deflected + 2.2, 41.0, pixel));
      color += disk(scene, hole, flatten, pixel) * edgeFade * (.48 + .52 * unmasked);

      // Secondary image of the disk above the shadow.
      vec2 arcPoint = vec2(scene.x * .83, scene.y * .74);
      float arc = length(arcPoint) - hole * 1.02;
      float upper = smoothstep(-.017, .095, scene.y);
      float arcDetail = noise(scene * vec2(102.0, 131.0) + vec2(u_time * .5, 0.0));
      float arcFilament = .36 + .64 * pow(.5 + .5 * sin(arc * 1400.0 + arcDetail * 2.8), 2.0);
      color += vec3(.36,.63,1.0) * upper * (.45 + arcDetail * .85) * (
        .34 * gaussian(arc - hole * .14, hole * .39) * arcFilament +
        1.30 * gaussian(arc + hole * .03, hole * .14) * arcFilament
      );
      color = mix(vec3(.002,.004,.012), color, unmasked);
      float rim = radial - hole * 1.014;
      float brightness = mix(1.35, .42, smoothstep(-.8, .92, scene.x / hole + scene.y / hole * .36));
      color += vec3(.27,.54,1.0) * brightness * gaussian(rim, hole * .15) * .35;
      color += vec3(.64,.84,1.0) * brightness * gaussian(rim, max(pixel, hole * .021)) * 1.24;
      color += vec3(.40,.74,1.0) * u_rays * rayLines(scene, hole, pixel) * .23;

      float vignette = mix(.60, 1.0, gaussian(length(p * vec2(.70,1.68)), .34));
      vec3 mapped = 1.0 - exp(-color * vignette * 1.47);
      gl_FragColor = vec4(pow(mapped, vec3(.90)), 1.0);
    }
  `;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }

  window.createBlackHoleShader = canvas => {
    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power'
    });
    if (!gl || gl.isContextLost()) return null;
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return null;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }

    gl.useProgram(program);
    const triangle = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(
      ['resolution', 'time', 'mass', 'inclination', 'rays']
        .map(name => [name, gl.getUniformLocation(program, 'u_' + name)])
    );

    return {
      resize(width, height) {
        const scale = Math.min(window.devicePixelRatio || 1, 1.5, 960 / width);
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform2f(uniforms.resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
      },
      draw(time, mass, inclination, showRays) {
        gl.uniform1f(uniforms.time, time);
        gl.uniform1f(uniforms.mass, mass);
        gl.uniform1f(uniforms.inclination, inclination);
        gl.uniform1f(uniforms.rays, Number(showRays));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  };
})();
