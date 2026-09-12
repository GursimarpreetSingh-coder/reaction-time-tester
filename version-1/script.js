var start = new Date().getTime();

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function move() {
    var hw = Math.random() * 60 + 60; // size between 60px and 120px

    var maxWidth = window.innerWidth - hw;
    var maxHeight = window.innerHeight - hw;

    var left = Math.random() * maxWidth;
    var top = Math.random() * maxHeight;

    var box = document.getElementById('box');
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    box.style.width = hw + 'px';
    box.style.height = hw + 'px';
    box.style.display = 'block';
    box.style.backgroundColor = getRandomColor();

    start = new Date().getTime();
}



document.getElementById('box').onclick = function () {
    document.getElementById('box').style.display = 'none';
    var finish = new Date().getTime();
    var totalTime = (finish - start) / 1000;
    alert(totalTime + ' second');

    // Wait 1 second before showing the next box
    setTimeout(move, 1000);
};

move();
