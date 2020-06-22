const pieChart = (function () {
  let width = 300,
    height = 300,
    radius = width / 2,
    margin = { x: 100, y: 100 };

  let pie = d3.pie()
    .value(d => d.duration)
    .sort(null);

  let arc = d3.arc()
    .innerRadius(radius / 2)
    .outerRadius(radius);

  let svg = d3.select('#chart-projects')
    .append('svg')
    .attr('width', width + margin.x)
    .attr('height', height + margin.y);

  let projectData = Object.entries(projects).map(([key, value]) => { (value).id = key; return value });

  let g = svg.selectAll('g.arc')
    .data(pie(projectData))
    .enter().append('g')
    .attr('class', 'arc')
    .attr('transform', `translate(${(width + margin.x) / 2},${(height + margin.y) / 2})`);
  g.exit().remove();

  let path = g.append('path')
    .attr('fill', d => d.data.color)
    .attr('d', arc)
    .each(function (d) { this._current = d; });

  let text = g.append('text')
    .attr('class', 'pie-text')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .text(d => d.data.name);

  function arcTween(a) {
    var i = d3.interpolate(this._current, a);
    this._current = i(0);
    return function (t) {
      return arc(i(t));
    };
  }

  return {
    update: function updatePieChart() {
      path = path.data(pie(projectData));
      path.transition().duration(1000).attrTween('d', arcTween);
    }
  }
})();

const barChart = (function () {
  let width = 600,
    height = 300,
    margin = { x: 100, y: 100 };

  // TODO: Fetch the period from a timepicker widget
  let startDate = new Date('2020-06-15');
  let endDate = new Date('2020-06-21');

  let dateData = Object.entries(tracker.dayEntries).map(([key, value]) => ({ date: key, duration: value }));

  let x = d3.scaleTime()
    .domain([startDate, endDate])
    .range([0, width])
    .nice()

  let y = d3.scaleLinear()
    .domain([0, d3.max(dateData, d => d.duration) + 30000])
    .range([height, 0]);

  let svg = d3.select('#chart-days')
    .append('svg')
    .attr('width', width + margin.x)
    .attr('height', height + margin.y);

  let yAxis = d3.axisLeft(y)  
    .tickFormat(d => formatTimeTimer(d));

  let xAxis = d3.axisBottom(x)
    // .tickSize(0)
    .tickPadding(10)
    .ticks(d3.timeDay)
    .tickFormat(d3.timeFormat('%a, %b %d'));

  svg.append('g')
    .attr('transform', `translate(${margin.x / 2},${height + margin.y / 2})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${margin.x / 2},${margin.y / 2})`)
    .call(yAxis);

  let g = svg.append('g')
    .attr('fill', '#2B9284')
    .selectAll('rect')
    .data(dateData)
    .enter().append('g');

  let bar = g.append('rect')
    .attr('x', d => x(new Date(d.date)) + (margin.x / 2) - 20)
    .attr('y', d => y(d.duration) + margin.y / 2)
    .attr('height', d => y(0) - y(d.duration))
    .attr('width', 80);

  g.append('text')
    .attr('x', d => x(new Date(d.date)) + margin.x / 2 - 10)
    .attr('y', d => y(d.duration) + margin.y / 2 - 10)
    .text(d => formatTimeTimer(d.duration));

  // TODO: Return an update function
  // TODO: Make chart responsive / update on window resize
})();