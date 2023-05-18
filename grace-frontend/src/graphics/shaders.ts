export class GraceShaders {
	// create an object to contain all the shaders
	public static readonly FINAL_PASS_VERTEX_SHADER = `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`;

	public static readonly FINAL_PASS_FRAGMENT_SHADER = `
      uniform sampler2D baseTexture;
      uniform sampler2D bloomTexture;
  
      varying vec2 vUv;
      void main() {
  
          gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
  
      }`;

	public static readonly NOISE_V3_SHADER = `
  //	Simplex 4D Noise 
  //	by Ian McEwan, Ashima Arts
  //
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}
  
  vec4 grad4(float j, vec4 ip){
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p,s;
  
    p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 
  
    return p;
  }
  
  float snoise(vec4 v){
    const vec2  C = vec2( 0.138196601125010504,  // (5 - sqrt(5))/20  G4
                          0.309016994374947451); // (sqrt(5) - 1)/4   F4
  // First corner
    vec4 i  = floor(v + dot(v, C.yyyy) );
    vec4 x0 = v -   i + dot(i, C.xxxx);
  
  // Other corners
  
  // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
    vec4 i0;
  
    vec3 isX = step( x0.yzw, x0.xxx );
    vec3 isYZ = step( x0.zww, x0.yyz );
  //  i0.x = dot( isX, vec3( 1.0 ) );
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
  
  //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
  
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
  
    // i0 now contains the unique values 0,1,2,3 in each channel
    vec4 i3 = clamp( i0, 0.0, 1.0 );
    vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
    vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );
  
    //  x0 = x0 - 0.0 + 0.0 * C 
    vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
    vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
    vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
    vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;
  
  // Permutations
    i = mod(i, 289.0); 
    float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute( permute( permute( permute (
               i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
             + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
             + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
             + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
  // Gradients
  // ( 7*7*6 points uniformly over a cube, mapped onto a 4-octahedron.)
  // 7*7*6 = 294, which is close to the ring size 17*17 = 289.
  
    vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;
  
    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
  
  // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4,p4));
  
  // Mix contributions from the five corners
    vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
                 + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
  
  }
    `;

	public static readonly NOISE_SHADER = `
    // https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
    /*float rand(vec2 c){
      return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }*/
  
  float noise(vec2 p, float freq ){
      float unit = 2.; //screenWidth/freq;
      vec2 ij = floor(p/unit);
      vec2 xy = mod(p,unit)/unit;
      //xy = 3.*xy*xy-2.*xy*xy*xy;
      xy = .5*(1.-cos(PI*xy));
      float a = rand((ij+vec2(0.,0.)));
      float b = rand((ij+vec2(1.,0.)));
      float c = rand((ij+vec2(0.,1.)));
      float d = rand((ij+vec2(1.,1.)));
      float x1 = mix(a, b, xy.x);
      float x2 = mix(c, d, xy.x);
      return mix(x1, x2, xy.y);
  }
  
  float pNoise(vec2 p, int res){
      float persistance = .5;
      float n = 0.;
      float normK = 0.;
      float f = 4.;
      float amp = 1.;
      int iCount = 0;
      for (int i = 0; i<50; i++){
          n+=amp*noise(p, f);
          f*=2.;
          normK+=amp;
          amp*=persistance;
          if (iCount == res) break;
          iCount++;
      }
      float nf = n/normK;
      return nf*nf*nf*nf;
  }
    `;

	public static readonly CURVE_VERTEX_SHADER = `
    #include <common>
          #include <color_pars_vertex>
          #include <fog_pars_vertex>
          #include <logdepthbuf_pars_vertex>
          #include <clipping_planes_pars_vertex>
          uniform float linewidth;
          uniform vec2 resolution;
          attribute vec3 instanceStart;
          attribute vec3 instanceEnd;
          attribute vec3 instanceColorStart;
          attribute vec3 instanceColorEnd;
          #ifdef WORLD_UNITS
              varying vec4 worldPos;
              varying vec3 worldStart;
              varying vec3 worldEnd;
            varying vec2 vUv;
          #else
              varying vec2 vUv;
          #endif
  
              attribute float instanceDistanceStart;
              attribute float instanceDistanceEnd;
              varying float vLineDistance;
  
      void trimSegment( const in vec4 start, inout vec4 end ) {
              // trim end segment so it terminates between the camera plane and the near plane
              // conservative estimate of the near plane
              float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
              float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
              float nearEstimate = - 0.5 * b / a;
              float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );
              end.xyz = mix( start.xyz, end.xyz, alpha );
          }
          void main() {
              #ifdef USE_COLOR
                  vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;
              #endif
                  vLineDistance = ( position.y < 0.5 ) ? instanceDistanceStart : instanceDistanceEnd;
                  vUv = uv;
              float aspect = resolution.x / resolution.y;
              // camera space
              vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
              vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );
              #ifdef WORLD_UNITS
                  worldStart = start.xyz;
                  worldEnd = end.xyz;
              #else
                  vUv = uv;
              #endif
              // special case for perspective projection, and segments that terminate either in, or behind, the camera plane
              // clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
              // but we need to perform ndc-space calculations in the shader, so we must address this issue directly
              // perhaps there is a more elegant solution -- WestLangley
              bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column
              if ( perspective ) {
                  if ( start.z < 0.0 && end.z >= 0.0 ) {
                      trimSegment( start, end );
                  } else if ( end.z < 0.0 && start.z >= 0.0 ) {
                      trimSegment( end, start );
                  }
              }
              // clip space
              vec4 clipStart = projectionMatrix * start;
              vec4 clipEnd = projectionMatrix * end;
              // ndc space
              vec3 ndcStart = clipStart.xyz / clipStart.w;
              vec3 ndcEnd = clipEnd.xyz / clipEnd.w;
              // direction
              vec2 dir = ndcEnd.xy - ndcStart.xy;
              // account for clip-space aspect ratio
              dir.x *= aspect;
              dir = normalize( dir );
              #ifdef WORLD_UNITS
                  // get the offset direction as perpendicular to the view vector
                  vec3 worldDir = normalize( end.xyz - start.xyz );
                  vec3 offset;
                  if ( position.y < 0.5 ) {
                      offset = normalize( cross( start.xyz, worldDir ) );
                  } else {
                      offset = normalize( cross( end.xyz, worldDir ) );
                  }
                  // sign flip
                  if ( position.x < 0.0 ) offset *= - 1.0;
                  float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );
                  // don't extend the line if we're rendering dashes because we
                  // won't be rendering the endcaps
                  #ifndef USE_DASH
                      // extend the line bounds to encompass  endcaps
                      start.xyz += - worldDir * linewidth * 0.5;
                      end.xyz += worldDir * linewidth * 0.5;
                      // shift the position of the quad so it hugs the forward edge of the line
                      offset.xy -= dir * forwardOffset;
                      offset.z += 0.5;
                  #endif
                  // endcaps
                  if ( position.y > 1.0 || position.y < 0.0 ) {
                      offset.xy += dir * 2.0 * forwardOffset;
                  }
                  // adjust for linewidth
                  offset *= linewidth * 0.5;
                  // set the world position
                  worldPos = ( position.y < 0.5 ) ? start : end;
                  worldPos.xyz += offset;
                  // project the worldpos
                  vec4 clip = projectionMatrix * worldPos;
                  // shift the depth of the projected points so the line
                  // segements overlap neatly
                  vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
                  clip.z = clipPose.z * clip.w;
              #else
                  vec2 offset = vec2( dir.y, - dir.x );
                  // undo aspect ratio adjustment
                  dir.x /= aspect;
                  offset.x /= aspect;
                  // sign flip
                  if ( position.x < 0.0 ) offset *= - 1.0;
                  // endcaps
                  if ( position.y < 0.0 ) {
                      offset += - dir;
                  } else if ( position.y > 1.0 ) {
                      offset += dir;
                  }
                  // adjust for linewidth
                  offset *= linewidth;
                  // adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
                  offset /= resolution.y;
                  // select end
                  vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;
                  // back to clip space
                  offset *= clip.w;
                  clip.xy += offset;
              #endif
              gl_Position = clip;
              vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation
              #include <logdepthbuf_vertex>
              #include <clipping_planes_vertex>
              #include <fog_vertex>
          }
    `;

	public static readonly CURVE_FRAGMENT_SHADER = `
    uniform float time;
    uniform float bloom;
    uniform vec3 diffuse;
          uniform float opacity;
          uniform float linewidth;
          #ifdef USE_DASH
              uniform float dashOffset;
              uniform float dashSize;
              uniform float gapSize;
          #endif
          varying float vLineDistance;
          #ifdef WORLD_UNITS
              varying vec4 worldPos;
              varying vec3 worldStart;
              varying vec3 worldEnd;
            varying vec2 vUv;
          #else
              varying vec2 vUv;
          #endif
          #include <common>
          #include <color_pars_fragment>
          #include <fog_pars_fragment>
          #include <logdepthbuf_pars_fragment>
          #include <clipping_planes_pars_fragment>
          vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {
              float mua;
              float mub;
              vec3 p13 = p1 - p3;
              vec3 p43 = p4 - p3;
              vec3 p21 = p2 - p1;
              float d1343 = dot( p13, p43 );
              float d4321 = dot( p43, p21 );
              float d1321 = dot( p13, p21 );
              float d4343 = dot( p43, p43 );
              float d2121 = dot( p21, p21 );
              float denom = d2121 * d4343 - d4321 * d4321;
              float numer = d1343 * d4321 - d1321 * d4343;
              mua = numer / denom;
              mua = clamp( mua, 0.0, 1.0 );
              mub = ( d1343 + d4321 * ( mua ) ) / d4343;
              mub = clamp( mub, 0.0, 1.0 );
              return vec2( mua, mub );
          }
      ${this.NOISE_SHADER}
          void main() {
              #include <clipping_planes_fragment>
              #ifdef USE_DASH
                  if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps
                  if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX
              #endif
              float alpha = opacity;
              #ifdef WORLD_UNITS
                  // Find the closest points on the view ray and the line segment
                  vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
                  vec3 lineDir = worldEnd - worldStart;
                  vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );
                  vec3 p1 = worldStart + lineDir * params.x;
                  vec3 p2 = rayEnd * params.y;
                  vec3 delta = p1 - p2;
                  float len = length( delta );
                  float norm = len / linewidth;
                  #ifndef USE_DASH
                      #ifdef USE_ALPHA_TO_COVERAGE
                          float dnorm = fwidth( norm );
                          alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );
                      #else
                          if ( norm > 0.5 ) {
                              discard;
                          }
                      #endif
                  #endif
              #else
                  #ifdef USE_ALPHA_TO_COVERAGE
                      // artifacts appear on some hardware if a derivative is taken within a conditional
                      float a = vUv.x;
                      float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
                      float len2 = a * a + b * b;
                      float dlen = fwidth( len2 );
                      if ( abs( vUv.y ) > 1.0 ) {
                          alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );
                      }
                  #else
                      if ( abs( vUv.y ) > 1.0 ) {
                          float a = vUv.x;
                          float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
                          float len2 = a * a + b * b;
                          if ( len2 > 1.0 ) discard;
                      }
                  #endif
              #endif
        
        float pn1 = abs(pNoise(vec2(vLineDistance * 0.05, time), 3)) * 0.75;
        float pn2 = pNoise(vec2(vLineDistance * 25. + time * 4., 0.123), 10) * 0.5 + 0.5;
        pn2 = clamp(pow(pn2, 4.), 0., 1.);
        vec3 c = mix(vec3(0, 0, 0.25), diffuse, pn1);
        c = mix(c, diffuse, pn2);
              vec4 diffuseColor = vec4( c, alpha );
        
              #include <logdepthbuf_fragment>
              #include <color_fragment>
              gl_FragColor = vec4( diffuseColor.rgb, alpha );
              #include <tonemapping_fragment>
              #include <encodings_fragment>
              #include <fog_fragment>
              #include <premultiplied_alpha_fragment>
        
        vec3 col = gl_FragColor.rgb;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0), bloom);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(vec3(1), col, bloom), pn2);
          }  `;
}
