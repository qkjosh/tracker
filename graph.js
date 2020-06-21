let width = 300,
    height = 300,
    radius = width / 2,
    margin = {x: 100, y: 100};

let pie = d3.pie()
    .value(d => d.duration)
    .sort(null);

let arc = d3.arc()
    .innerRadius(radius / 2)
    .outerRadius(radius);

let svg = d3.select('#reports-display')
    .append('svg')
    .attr('width', width + margin.x)
    .attr('height', height + margin.y);

let projectData = Object.entries(projects).map(([key, value], i) => {(value).id = key; return value});

let g = svg.selectAll('g.arc')
  .data(pie(projectData))
  .enter().append('g')
    .attr('class', 'arc')
    .attr('transform', `translate(${(width + margin.x)/2},${(height + margin.y)/2})`);
g.exit().remove();

let path = g.append('path')
  .attr('fill', d => d.data.color)
  .attr('d', arc)
  .each(function(d) { this._current = d; });

let text = g.append('text')
  .attr('class', 'pie-text')
  .attr('transform', d => `translate(${arc.centroid(d)})`)
  .attr('text-anchor', 'middle')
  .text(d => d.data.name);

function arcTween(a) {
  var i = d3.interpolate(this._current, a);
  this._current = i(0);
  return function(t) {
    return arc(i(t));
  };
}

function updatePieChart() {
  path = path.data(pie(projectData));
  path.transition().duration(1000).attrTween('d', arcTween);
}