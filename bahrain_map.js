var map;
var markers = [];
var infowindow;
var bahrainbounds;
var ajaxtransl = 0;
var currentsearch = null;
var currentmarker = null;
var ar = /[\u0600-\u06FF]/;
var smallscreen = $(window).width() < 576;

window.onload = loadGmapsAPI;
function loadGmapsAPI() {
    $.mobile.showPageLoadingMsg();
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'http://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&language=ar&' + 'callback=initialise';
    document.body.appendChild(script);
    $.mobile.hidePageLoadingMsg();
}

function initialise() {
    initialiseMap();
    initialiseMenu();
    refreshControlButtons();
    $("#openmenu").trigger("click");
}

function initialiseMap() {
    var mapOptions = {
        zoom: 10,
        center: new google.maps.LatLng(26.05, 50.55),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        panControl: false,
        zoomControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
            style:google.maps.MapTypeControlStyle.DROPDOWN_MENU
        },
        scaleControl: false,
        streetViewControl: false,
        overviewMapControl: false
    };
    if(smallscreen){
        mapOptions.zoomControl = false;
        mapOptions.mapTypeControl = false;
    }
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    bahrainbounds = new google.maps.LatLngBounds(new google.maps.LatLng(25.791, 50.372),
        new google.maps.LatLng(26.339, 50.726));
    map.fitBounds(bahrainbounds);

    infowindow = new google.maps.InfoWindow();
    google.maps.event.addListener(map, 'click', function() {
        infowindow.close();
        currentmarker = null;
        refreshControlButtons();
        $("#index").text("");
        $("#location").text("");
    });
}
function initialiseMenu() {
    $("#menu").on("click", "a", function () {
        switch ($(this).attr("href")) {
            case "#protests":
                searchTweets("(مسيرة OR مسيرات OR مظاهرة OR مظاهرات OR اعتصام) (");
                break;
            case "#arrests":
                searchTweets("(اعتقال OR عتقل OR افراج OR سراح) (");
                break;
            case "#checkpoints":
                searchTweets("\"نقطة تفتيش\" (#chpo OR ");
                break;
            case "#police":
                searchTweets("(شرطة OR شغب OR مرتزق OR قوات OR قمع OR قتح OR داهم) (");
                break;
            case "#anything":
                searchTweets("(");
                break;
            default:
                break;
        }
        if($(this).attr("href") !== "#") {
            $("header h1").html($(this).html());
            $("#menu").panel("close");
            map.fitBounds(bahrainbounds);
        }
    });
    $("#search").change(function() {
        if($(this).val() !== ""){
            searchTweets($(this).val() + " (");
            $("header h1").text($("#search").val());
            $("#menu").panel("close");
        }
    });

    $("#openmenu").click(function() {
        $("#menu").panel("open");
        if(!smallscreen){$("#search").focus()}
    });
    $("#refresh").click(function(){
        if(currentsearch !== null){
            searchTweets(currentsearch);
        }
    });

    $(document).keydown(function(e){
        if (markers.length > 0) {
            switch (e.keyCode) {
                case 37:
                    $("#prev").trigger("click");
                    break;
                case 39:
                    $("#next").trigger("click");
                    break;
                case 40:
                    $("#info").trigger("click");
                    break;
                case 27:
                    infowindow.close();
                    break;
            }
        }
    });
    $("#prev").click(function(){
        if (markers.length > 0) {
            if(currentmarker !== null && currentmarker < markers.length){
                currentmarker++;
            }
            else {
                currentmarker = markers.length - 1;
            }
            openCurrentMarker();
        }
    });
    $("#next").click(function(){
        if (markers.length > 0) {
            if(currentmarker !== null && currentmarker > 0){
                currentmarker--;
            }
            else {
                currentmarker = 0;
            }
            openCurrentMarker();
        }
    });
    $("#info").click(function(){
        var s = currentmarker;
        if(markers[s].lang === "ar" && markers[s].translation === null) {
            $.mobile.showPageLoadingMsg();
            ajaxtransl++;
            $.ajaxSetup({timeout: 15000});
            $.getJSON("http://api.mymemory.translated.net/get?langpair=ar|en&de=reda@bahrainwatch.org&q="
                    + encodeURIComponent(markers[s].text),
                function(data){
                    markers[s].translation = data.responseData.translatedText;
                    markers[s].lang = "en";
                })
                .fail(function(jqXHR, textStatus, errorThrown){showError(jqXHR, textStatus, errorThrown)})
                .always(function(){
                    infowindow.close();
                    openCurrentMarker();
                    ajaxtransl--;
                    if(ajaxtransl === 0) {$.mobile.hidePageLoadingMsg()}
                });
        }
        else{
            markers[s].lang = markers[s].lang === "en" && markers[s].translation !== null? "ar" : "en";
            infowindow.close();
            openCurrentMarker();
        }
    });
}

function refreshControlButtons() {
    if (markers.length > 0) {
        if(currentmarker === null) {
            $("#prev").removeClass("ui-disabled");
            $("#next").removeClass("ui-disabled");
        }
        else {
            if(currentmarker === markers.length - 1) {$("#prev").addClass("ui-disabled");}
            else {$("#prev").removeClass("ui-disabled");}
            if(currentmarker === 0) {$("#next").addClass("ui-disabled");}
            else {$("#next").removeClass("ui-disabled");}
        }
    }
    else {
        $("#prev").addClass("ui-disabled");
        $("#next").addClass("ui-disabled");
    }
    if($("div .infowindow").length > 0) {
        $("#info").removeClass("ui-disabled");
    }
    else{
        $("#info").addClass("ui-disabled");
    }
}

function openCurrentMarker() {
    var s = currentmarker;
    var timestamp = formatTime(markers[s].created_at);

    var text =  markers[s].lang === "en" && markers[s].translation !== null?
        markers[s].translation : markers[s].text;

    text = text.replace(/@\w+:*/gm, "").replace(/["“”]/gm,"").replace(/^:/gm,"");

    var media = '';
    for(l in markers[s].urls) {
        var e_url = markers[s].urls[l].expanded_url;
        var d_url = markers[s].urls[l].display_url;
        text = text.replace(markers[s].urls[l].url,
            '<a href=\"' + e_url +'\">' + d_url + '</a>');

        if(/youtube\.com|youtu\.be/g.test(e_url)){
            media += e_url.replace(/feature=player_embedded&?/g,'').replace(
                /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([\w\-]{10,12})(?:&feature=related)?(?:[\w\-]{0})?/g,
                '<iframe '
                    + 'src="http://www.youtube.com/embed/$1?&fs=1"'
                    + 'frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen>'
                    + '</iframe>').replace(/<\/iframe>.+$/g,'');
        }
        else if(/instagram\.com|instagr\.am/g.test(e_url)){
            media += '<a href=\"'
                + e_url
                + '\"><img src=\"'
                + e_url.concat('media/?size=m')
                + '"></a>';

        }
        else if(/twitpic\.com/g.test(e_url)){
            media += '<a href=\"'
                + e_url
                + '\"><img src=\"'
                + e_url.replace(/(?:https?:\/\/)?(?:www\.)?(?:twitpic\.com)\/(.+)$/g,
                'http://twitpic.com/show/full/$1.jpg')
                + '"></a>';

        }
        else if(/\.jpg|\.png/g.test(e_url)){
            media += '<a href=\"'
                + e_url
                + '\"><img src=\"'
                + e_url
                + '"></a>';
        }
    }
    if (markers[s].media !== undefined) {
        for (m in markers[s].media) {
            var e_url = markers[s].media[m].expanded_url;
            var d_url = markers[s].media[m].display_url;
            text = text.replace(markers[s].media[m].url,
                '<a href=\"' + e_url + '\">' + d_url + '</a>');
            media += '<a href=\"'
                + e_url
                + '\"><img src=\"'
                + markers[s].media[m].media_url_https
                + ':small"></a>';
        }
    }

    if (media === '') {
        $("#hidden .tweet-media").css('display', 'none');
    } else {
        $("#hidden .tweet-media").css('display','block');
    }

    $("#hidden .profile-link").text('@' + markers[s].from_user);
    $("#hidden .profile-link").attr('href','https://twitter.com/' + markers[s].from_user + '/status/' + markers[s].id_str);
    $("#hidden .profile-image").attr('src', markers[s].profile_image_url);
    $("#hidden .profile-image").parent().attr('href','https://twitter.com/' + markers[s].from_user);
    $("#hidden .tweet-text").html(text);
    $("#hidden .tweet-media").html(media);
    $("#hidden .tweet-time").text(timestamp[0]);
    $("#hidden .tweet-duration").text(timestamp[1]);

    var html = '<div class="infowindow">' + $("#hidden").html() + '</div>';

    infowindow.setContent(html);
    infowindow.open(map, markers[s]);
    updateTweetIndex();
    refreshControlButtons();
}

function updateTweetIndex() {
    if (markers.length > 0) {
        $("#index").text((currentmarker + 1) + '/');
        $("#total").text(markers.length);
        $("#location").text(markers[currentmarker].title);
    }
    else {
        $("#index, #total, #location").text('');
    }
}

function searchTweets(keywords, page) {
    page = page || 1;
    if(page === 1){
        clearMarkers();
        $.mobile.showPageLoadingMsg();
    }
    currentsearch = keywords;
    var arabic = ar.test(keywords) || keywords === "(";
    keywords += arabic? "#Bahrain OR #البحرين)" : keywords === "("?"#Bahrain OR #البحرين)":"#Bahrain)";
    keywords += "-filter:retweets";
    $.ajax({
        url: 'http://search.twitter.com/search.json',
        type: 'GET',
        dataType: 'jsonp',
        cache : false,
        timeout:15000,
        data: {
            q: keywords,
            lang: arabic? "ar" : "",
            result_type: "recent",
            include_entities: 1,
            rpp: 100,
            page: page
        }
    })
        .done(function(response){setTimeout(processTweets(response.results, page),0)})
        .fail(function(jqXHR, textStatus, errorThrown){showError(jqXHR, textStatus, errorThrown)});
}

function processTweets(tweets, page) {
    page = page || 1;
    if (tweets.length === 0 && page === 1){alert('No tweets found!')}
    else if (tweets.length > 0) {
        for (i in tweets) {
            var latlng = findLocation(tweets[i].text);
            if (latlng !== null) {

                latlng[0] = parseFloat(latlng[0]) + randomDecimal();
                latlng[1] = parseFloat(latlng[1]) + randomDecimal();

                var index = markers.length;
                var arabic = ar.test(tweets[i].text);
                var marker = new google.maps.Marker({
                    map: map,
                    position: new google.maps.LatLng(latlng[0], latlng[1]),
                    title: latlng[2],
                    index: index,
                    created_at: tweets[i].created_at,
                    from_user: tweets[i].from_user,
                    profile_image_url: tweets[i].profile_image_url,
                    id_str: tweets[i].id_str,
                    text: tweets[i].text,
                    urls: tweets[i].entities.urls,
                    media: tweets[i].entities.media,
                    translation: null,
                    lang: arabic ? "ar" : "en",
                    icon: 'images/marker.png',
                    draggable: false
                });
                markers.push(marker);

                google.maps.event.addListener(markers[markers.length - 1], 'click', function () {
                    currentmarker = this.index;
                    openCurrentMarker();
                });
            }
        }
    }
    if(markers.length > 0) {
        if (markers.length < 25 && tweets.length > 0) {
            updateTweetIndex();
            setTimeout(searchTweets(currentsearch,(page + 1)),0);
        }
        else {
            showAllMarkers();
            currentmarker = 0;
            openCurrentMarker();
            $.mobile.hidePageLoadingMsg();
        }
    }
    else {$.mobile.hidePageLoadingMsg(); alert('No locations found in tweets!');}
}
function showError(jqXHR, textStatus, errorThrown) {
    $.mobile.hidePageLoadingMsg();
    alert("connection error: " + textStatus);
    console.log("connection error: " + textStatus, errorThrown);
}

function showAllMarkers() {
    markers_bounds = new google.maps.LatLngBounds();
    for (m in markers) {
        markers_bounds.extend(markers[m].getPosition());
    }
    map.fitBounds(markers_bounds);
    if (map.getZoom() > 14) {
        map.setZoom(14)
    }
}

function clearMarkers(){
    for (i in markers) {
        markers[i].setMap(null);
    }
    markers.length = 0;
    currentmarker = null;
    updateTweetIndex();
}


function formatTime(tweet_time){
    var d = new Date(tweet_time);
    var now = new Date();
    var timelength = (now - d)/60000;
    var timestamp = [];

    timestamp [0] = d.toDateString().substr(0,3) +', '
        + d.toDateString().substr(8,2) + ' '
        + d.toDateString().substr(4,3);

    var tt;
    if (d.getHours() >= 12) {
        tt = " PM";
        if (d.getHours() > 12) {
            d.setHours(d.getHours() - 12);
        }
    }
    else {
        tt = " AM";
        if (d.getHours() === 0) {
            d.setHours(12);
        }
    }

    timestamp [0] += ' | ' + d.getHours() + ':' + (d.getMinutes()<10?'0':'') + d.getMinutes() + tt;

    timestamp [1] =
            timelength < 1      && "قبل لحظات" ||
            timelength < 2      && "قبل دقيقة" ||
            timelength < 11     && "قبل " + Math.floor(timelength) + " دقائق" ||
            timelength < 60     && "قبل " + Math.floor(timelength) + " دقيقة" ||
            timelength < 90     && "قبل ساعة" ||
            timelength < 120    && "قبل ساعة و نصف" ||
            timelength < 180    && "قبل ساعتان" ||
            timelength < 660    && "قبل " + Math.floor(timelength/60) + " ساعات" ||
            timelength < 1440   && "قبل " + Math.floor(timelength/60) + " ساعة" ||
            (now.getDate()-d.getDate()) === 1   && "بالأمس" ||
            (now.getDate()-d.getDate()) > 1    && "";

    return timestamp;
}

var y = 1;
function randomDecimal() {
    y *= -1;
    return y * (Math.random() * 0.000925);
}

function findLocation(tweet_text) {
    var latlng = null;
    for (place in mappoints) {
        var pattern = place.replace(/أبو/ig,"(بو|ابو|أبو)")
            .replace(/(\s|^)(ال)/ig,"($2)*")
            .replace(/\s/ig,"(\\s)*");
        var regexp = new RegExp("\(\^|\\s|\[:\\-#.,،|\]\)" + pattern + "\(\$|\\s|\[:\\-#.,،|\]\)","im");
        if (tweet_text.match(regexp)) {
            latlng = mappoints[place].match(/\d+[.]\d+/g);
            latlng.push(place);
            break;
        }
    }
    return latlng;
}

var mappoints = {
    "مركز المحافظة الشمالية للتوظيف و التدريب": "26.219873,50.502216",
    "المركز الوطني لدعم المنظمات الأهلية": "26.202852,50.563910",
    "مدرسة بدر الكبرى الإبتدائية للبنين": "26.167930,50.560474",
    "مدرسة أبو صيبع الإبتدائية للبنين": "26.217356,50.503048",
    "مدرسة مدينة عيسى الثانوية للبنين": "26.165063,50.563063",
    "مدرسة الخميس الإبتدائية للبنين": "26.207111,50.549308",
    "مدرسة سارة الإبتدائية للبنات": "26.220312,50.537659",
    "مأتم الحاج حسن ناصر العريبي": "26.182900,50.553895",
    "مستشفى الإرسالية الأمريكية": "26.231273,50.582649",
    "قلعة الشيخ سلمان بن أحمد": "26.117750,50.562820",
    "مأتم الحاج حسين بن جعفر": "26.218946,50.537558",
    "مركز شفاء الجزيرة الصحي": "26.233229,50.583602",
    "مستشفى قوة دفاع البحرين": "26.135717,50.523262",
    "مستشفى البحرين الدولي": "26.219191,50.526174",
    "مستشفى البركة للخصوبة": "26.208925,50.592242",
    "مستشفى المحرق للولاده": "26.269549,50.614227",
    "حلبة البحرين الدولية": "26.030325,50.511214",
    "مركز أحمد كانو الطبي": "26.139465,50.599540",
    "مأتم كرزكان الشمالي": "26.116375,50.480860",
    "مدرسة تدريب السياقة": "26.122423,50.572005",
    "مطار البحرين الدولي": "26.270833,50.633610",
    "مأتم النساء الكبير": "26.098274,50.481921",
    "مأتم فاطمة الزهراء": "26.212491,50.488191",
    "مدرسة بيان البحرين": "26.161255,50.549470",
    "مستشفى الطب النفسي": "26.217035,50.566947",
    "المستشفى الأمريكي": "26.231273,50.582649",
    "مستشفى قوة الدفاع": "26.135717,50.523262",
    "المدرسة الداوودية": "26.183350,50.583621",
    "شارع عمار بن ياسر": "26.229381,50.579720",
    "مستشفى إبن النفيس": "26.205223,50.579331",
    "مستشفى الملك حمد": "26.262380,50.600903",
    "المستشفى العسكري": "26.135717,50.523262",
    "بوابة مدينة عيسى": "26.169810,50.544790",
    "تقاطع مدينة عيسى": "26.186750,50.535780",
    "كوبري مدينة عيسى": "26.174720,50.541140",
    "مأتم آل عبد الحي": "26.224791,50.543619",
    "مستشفى السلمانية": "26.216227,50.572193",
    "مركز كانو الصحي": "26.085254,50.513086",
    "المستشفى النفسي": "26.217035,50.566947",
    "المدرسة الهندية": "26.158336,50.541293",
    "الواجهة البحرية": "26.248185,50.570508",
    "حديقة السلمانية": "26.221320,50.583450",
    "شارع مدينة عيسى": "26.174720,50.541140",
    "مأتم سار للنساء": "26.192727,50.487358",
    "مدخل مدينة عيسى": "26.169810,50.544790",
    "مسجد الحاج خميس": "26.181314,50.583284",
    "مسجد الشيخ عزيز": "26.204070,50.534581",
    "دوار عبد الكريم": "26.219180,50.530420",
    "السهلة الجنوبية": "26.200200,50.531700",
    "السهلة الشمالية": "26.207900,50.531000",
    "الرفاع الشمالي": "26.144132,50.547204",
    "إشارات سلماباد": "26.186750,50.535780",
    "جزيرة أم الشجر": "26.228888,50.655833",
    "جسر مدينة عيسى": "26.174720,50.541140",
    "شارع أبو غزالة": "26.208950,50.571446",
    "مدرسة المعامير": "26.140205,50.606938",
    "حلة عبد الصالح": "26.227500,50.516600",
    "مسجد أبو عبيد": "26.152375,50.498130",
    "مدرسة السياقة": "26.122423,50.572005",
    "مستشفى الكندي": "26.208772,50.567578",
    "البلاد القديم": "26.206944,50.557777",
    "الرفاع الشرقي": "26.116263,50.571803",
    "الرفاع الغربي": "26.122660,50.542027",
    "تقاطع سلماباد": "26.186750,50.535780",
    "جامعة البحرين": "26.049886,50.508384",
    "حلبة الفورملا": "26.035015,50.511511",
    "مدينة الزهراء": "26.116666,50.500000",
    "مدرسة الحكمة": "26.151845,50.575668",
    "مدرسة النسيم": "26.152951,50.541056",
    "مدرسة البيان": "26.161255,50.549470",
    "مجمع البحرين": "26.229370,50.537320",
    "دوار النعيمي": "26.159600,50.521350",
    "شارع الجنبية": "26.194476,50.462959",
    "شارع العدلية": "26.210758,50.588704",
    "شارع المتنبي": "26.228761,50.576320",
    "شارع المعارض": "26.228843,50.595369",
    "عمار بن ياسر": "26.160258,50.568728",
    "مدرسة الجسرة": "26.161975,50.455045",
    "حلبة البحرين": "26.035015,50.511511",
    "قرية القرية": "26.201177,50.464416",
    "مدرسة النور": "26.167602,50.602242",
    "الدبلوماسية": "26.242900,50.587000",
    "النبيه صالح": "26.182327,50.584754",
    "بلاد القديم": "26.208000,50.555900",
    "دوار الساعة": "26.133606,50.537901",
    "دوار الفخار": "26.161359,50.521985",
    "رأس الممطلة": "25.895277,50.518888",
    "روضة الصخير": "26.050000,50.533333",
    "شارع الرفاع": "26.126365,50.560940",
    "شارع الكويت": "26.209317,50.584137",
    "فخر البحرين": "26.187086,50.537901",
    "فخر المملكة": "26.187042,50.537737",
    "مسجد الفاتح": "26.218847,50.598099",
    "باب البحرين": "26.234086,50.575574",
    "مسجد القرية": "26.181622,50.584599",
    "وزارة العمل": "26.167789,50.541056",
    "وسط المنامة": "26.233404,50.578278",
    "جبلة الحبشي": "26.213229,50.527791",
    "دوار القلعة": "26.225017,50.577277",
    "جبل الدخان": "26.037900,50.542700",
    "دوار القدم": "26.217940,50.521320",
    "عين المهزة": "26.167222,50.627500",
    "عين أم جدر": "25.902222,50.574166",
    "قصر الصخير": "26.063194,50.526497",
    "مجمع الريف": "26.093140,50.489010",
    "مدينة زايد": "26.167150,50.538144",
    "مدينة عيسى": "26.173611,50.547777",
    "مسجد القدم": "26.115010,50.482620",
    "جسر سترة": "26.175537,50.596103",
    "جزر أمواج": "26.290240,50.664690",
    "جامعة AMA": "26.183769,50.519207",
    "جامعة أما": "26.183769,50.519207",
    "السلمانية": "26.216227,50.572193",
    "النويدرات": "26.133333,50.599999",
    "أبو صيدان": "26.200000,50.533333",
    "عين الدار": "26.212200,50.536300",
    "قلعة عراد": "26.252507,50.627027",
    "محطة جواد": "26.224428,50.521148",
    "عين رستان": "26.165403,50.511040",
    "مدينة حمد": "26.116666,50.500000",
    "أبو العيش": "26.158750,50.621570",
    "أبو عشيرة": "26.210327,50.579573",
    "أبو كوارة": "26.130500,50.562300",
    "الصافرية": "26.076128,50.490267",
    "البرهامة": "26.216727,50.553677",
    "البسيتين": "26.273223,50.609368",
    "الجبيلات": "26.184344,50.550117",
    "الخارجية": "26.162692,50.608072",
    "الشاخورة": "26.209757,50.505797",
    "الصالحية": "26.216787,50.561445",
    "القضيبية": "26.218678,50.593821",
    "المحمديه": "26.200117,50.436630",
    "أبو صيبع": "26.217222,50.504166",
    "أم الحصم": "26.203018,50.595116",
    "بني جمرة": "26.211388,50.459722",
    "أبو ماهر": "26.241332,50.613508",
    "جد الحاج": "26.234300,50.501700",
    "دار كليب": "26.069617,50.500623",
    "شيخ عزيز": "26.204056,50.534593",
    "المالكية": "26.098060,50.486670",
    "الجنبية": "26.184725,50.467002",
    "العاصمة": "26.216666,50.583333",
    "العدلية": "26.214600,50.584700",
    "الغريفة": "26.205490,50.602000",
    "المنامة": "26.216666,50.583333",
    "مركز ١٧": "26.086020,50.509480",
    "مركز 17": "26.086020,50.509480",
    "دوار ١٣": "26.096940,50.500310",
    "دوار 13": "26.096940,50.500310",
    "دوار 12": "26.103200,50.498330",
    "دوار ١٢": "26.103200,50.498330",
    "دوار 17": "26.086020,50.509480",
    "دوار ١٧": "26.086020,50.509480",
    "سلماباد": "26.183333,50.516666",
    "كرباباد": "26.230535,50.527791",
    "مركوبان": "26.163177,50.619086",
    "نويدرات": "26.134720,50.597500",
    "السنابس": "26.226559,50.545910",
    "الكنيسة": "26.232150,50.582230",
    "الماحوز": "26.207910,50.587344",
    "المعارض": "26.229090,50.543500",
    "الدواجن": "26.133245,50.480103",
    "المطار": "26.270833,50.633610",
    "الصخير": "25.988900,50.535000",
    "الجفير": "26.211111,50.601111",
    "البحير": "26.145925,50.567919",
    "البديع": "26.216666,50.450000",
    "الخميس": "26.205833,50.549722",
    "الدراز": "26.216666,50.466666",
    "الرفاع": "26.130000,50.555000",
    "الزلاق": "26.050000,50.483333",
    "القلعة": "26.223012,50.575102",
    "الكورة": "26.181695,50.554324",
    "المحرق": "26.250000,50.616666",
    "الهملة": "26.138673,50.477345",
    "باربار": "26.229444,50.480555",
    "بو قوة": "26.198302,50.516146",
    "جد علي": "26.178871,50.562739",
    "جنوسان": "26.225800,50.494800",
    "دمستان": "26.123783,50.469587",
    "سجن جو": "25.991527,50.616495",
    "سماهيج": "26.282980,50.633480",
    "شهركان": "26.075378,50.499329",
    "كرزكان": "26.110639,50.474759",
    "معامير": "26.135900,50.611300",
    "واديان": "26.159170,50.611110",
    "جد حفص": "26.219863,50.532967",
    "البندر": "26.148230,50.619467",
    "الجسرة": "26.163800,50.452000",
    "الحجير": "26.185000,50.551400",
    "الحورة": "26.233700,50.593200",
    "السهلة": "26.204800,50.526500",
    "المصلى": "26.206670,50.538680",
    "المقشع": "26.222200,50.517300",
    "المهزة": "26.169440,50.626110",
    "النعيم": "26.227700,50.568400",
    "المؤيد": "26.235175,50.541598",
    "الحجر": "26.215577,50.512265",
    "الحلة": "26.227800,50.519900",
    "الدير": "26.286528,50.623622",
    "الديه": "26.225653,50.535556",
    "الرفة": "26.086296,50.529085",
    "الزنج": "26.210211,50.564034",
    "السيف": "26.232220,50.536810",
    "القدم": "26.213167,50.520027",
    "المرخ": "26.201306,50.479931",
    "توبلي": "26.188888,50.550000",
    "جرداب": "26.168500,50.572100",
    "عذاري": "26.199000,50.550800",
    "عوالي": "26.084444,50.550555",
    "قلالي": "26.266666,50.650000",
    "كرانة": "26.231222,50.510971",
    "مقابة": "26.211320,50.495449",
    "بابكو": "26.143782,50.639224",
    "الحد": "26.212633,50.674187",
    "بوري": "26.155310,50.498036",
    "جيان": "26.229370,50.537320",
    "سترة": "26.153400,50.618300",
    "عالي": "26.151944,50.525555",
    "عراد": "26.259000,50.630600",
    "عسكر": "26.056936,50.616330",
    "ألبا": "26.094960,50.605320",
    "سار": "26.196111,50.486111",
    "سند": "26.150000,50.583333",
    "صدد": "26.087715,50.495449",
    "عكر": "26.143060,50.610280",
    "جو": "25.998610,50.61667",
    "Northern Governorate Center for Employment & Training": "26.219873,50.502216",
    "Mohammed Jassim Kanoo Health Centre": "26.085254,50.513086",
    "Badr Al kubra Primary Boys School": "26.167930,50.560474",
    "Al Khamees Primary Boys School": "26.207111,50.549308",
    "Al Naseem International School": "26.152951,50.541056",
    "Bahrain Defence Force Hospital": "26.135717,50.523262",
    "Bahrain International Hospital": "26.219191,50.526174",
    "Isa Town Secondary boys school": "26.165063,50.563063",
    "King Hamad University Hospital": "26.262380,50.600903",
    "Qassar `Isa Bin Sayf al Binali": "26.183333,50.599999",
    "Sitra Primary Boys High School": "26.161410,50.616981",
    "Abu Saiba Primary Boys School": "26.217356,50.503048",
    "Al Hekma International School": "26.151845,50.575668",
    "Bahrain International Airport": "26.270833,50.633610",
    "Bahrain International Circuit": "26.030325,50.511214",
    "Al Baraka Fertility Hospital": "26.208925,50.592242",
    "The Father's House AG Church": "26.203563,50.599286",
    "Umm Al Hassam Police Station": "26.204857,50.600055",
    "Muharraq Maternity Hospital": "26.269549,50.614227",
    "Sarah Primary Girls School": "26.220312,50.537659",
    "American Mission Hospital": "26.231273,50.582649",
    "Jamal Al Deen Afghani Ave": "26.258640,50.619129",
    "Al Qarah ash Shamaliyah": "26.008611,50.559444",
    "AbdulKareem Roundabout": "26.219180,50.530420",
    "Hassan Bin Thabit Ave": "26.218929,50.588261",
    "Indian School Bahrain": "26.158336,50.541293",
    "University of Bahrain": "26.049886,50.508384",
    "Ammar Bin Yasser Ave": "26.229381,50.579720",
    "Northern Governorate": "26.155191,50.482517",
    "Southern Governorate": "25.938101,50.575688",
    "Umm Al Hassam Mosque": "26.201807,50.597501",
    "Capital Governorate": "26.228516,50.586049",
    "Central Governorate": "26.142609,50.565329",
    "Bahrain University": "26.049886,50.508384",
    "Jazirat ash Shaykh": "26.050000,50.632222",
    "Ministry of Labour": "26.167789,50.541056",
    "Qurayn adh Dhirban": "25.936388,50.602777",
    "Jabal Lughaybirat": "26.058333,50.548333",
    "Riffa Clock Tower": "26.133606,50.537901",
    "The Indian School": "26.168143,50.606048",
    "Clock Roundabout": "26.133606,50.537901",
    "Fakhr Al-Bahrain": "26.187086,50.537901",
    "Gudaibiya Mosque": "26.224099,50.588154",
    "Gudaibiya Palace": "26.218663,50.591878",
    "Hillat AbduSaleh": "26.227500,50.516600",
    "Jazirat as Sayah": "26.270555,50.591666",
    "Mina' al Manamah": "26.237222,50.567777",
    "Qadam Roundabout": "26.217940,50.521320",
    "Ra's al Mamtalah": "25.895277,50.518888",
    "Rawdat as Sakhir": "26.050000,50.533333",
    "Um Al Hassam Ave": "26.202518,50.591461",
    "Al Muhammadiyah": "26.200117,50.436630",
    "Bani Jamrah Ave": "26.213651,50.462121",
    "Bilad Al Qadeem": "26.206944,50.557777",
    "Diplomatic area": "26.242900,50.587000",
    "Exhibition Road": "26.228843,50.595369",
    "Fasht al Hadbah": "26.283333,50.583333",
    "Jabal ad Dukhan": "26.038578,50.545910",
    "Mina Salman Ave": "26.206696,50.597189",
    "Muharraq Island": "26.266941,50.638390",
    "Riffa Alshamali": "26.144132,50.547204",
    "Abu Mahir Fort": "26.241332,50.613508",
    "Bu Ashira Park": "26.209211,50.582083",
    "Central Manama": "26.233404,50.578278",
    "Dar Kulayb Ave": "26.067885,50.504954",
    "Fasht Bu Thawr": "25.800000,50.766666",
    "Jazirat Ya`suf": "26.106666,50.445277",
    "Juzur al Wukur": "25.653611,50.815000",
    "Sh Aziz Mosque": "26.204070,50.534581",
    "Dil` ar Rifa`": "26.085555,50.517222",
    "Fasht Bartufi": "26.235000,50.460000",
    "Jawad Station": "26.224428,50.521148",
    "Jiblat Habshi": "26.213229,50.527791",
    "Junaibiya Ave": "26.194476,50.462959",
    "Manama Center": "26.233404,50.578278",
    "Roundabout 12": "26.103200,50.498330",
    "Roundabout 13": "26.096940,50.500310",
    "Roundabout 17": "26.086020,50.509480",
    "Salmaniya Ave": "26.219204,50.577206",
    "Umm Al Hassam": "26.203018,50.595116",
    "Al Janabiyah": "26.184725,50.467002",
    "Bahrain Fort": "26.233359,50.520351",
    "E Al Akr Ave": "26.141193,50.609208",
    "Fasht Rustan": "26.271944,50.570555",
    "Hindu Temple": "26.231927,50.577165",
    "lecture Bldg": "26.158489,50.534234",
    "Motanabi Ave": "26.228761,50.576320",
    "Qadam Mosque": "26.115010,50.482620",
    "Qarn Ibrahim": "25.914166,50.552777",
    "Qassar Diwan": "26.182500,50.663611",
    "Qassar Jurdi": "26.283888,50.662222",
    "Ra's Dawarin": "26.250000,50.566666",
    "Um Al Naasan": "26.147929,50.399815",
    "Adhari Park": "26.198528,50.545263",
    "Al Awbayidh": "26.033333,50.533333",
    "Al Mu`tarid": "25.786666,50.714166",
    "Al Qurayyah": "26.201177,50.464416",
    "Alghurayfah": "26.205630,50.614551",
    "Alriffa Ave": "26.126365,50.560940",
    "Hadd ad Dib": "25.556111,50.803055",
    "Nabih Saleh": "26.182327,50.584754",
    "North Sihla": "26.207900,50.531000",
    "Qudhaibiyah": "26.218678,50.593821",
    "South Sihla": "26.200200,50.531700",
    "Abu Alaish": "26.158750,50.621570",
    "Adliya Ave": "26.210758,50.588704",
    "Al Manamah": "26.216666,50.583333",
    "Al Musalla": "26.209189,50.538144",
    "Bani Jamra": "26.211388,50.459722",
    "Bu Asheera": "26.210327,50.579573",
    "Dar Kulaib": "26.069617,50.500623",
    "Dar Kulayb": "26.069617,50.500623",
    "East Riffa": "26.116263,50.571803",
    "Exhibition": "26.229090,50.543500",
    "Hamad Town": "26.116666,50.500000",
    "Jaw Prison": "25.991527,50.616495",
    "Juzayyirah": "26.190277,50.584722",
    "Kharijiyya": "26.162692,50.608072",
    "Kuwait Ave": "26.209317,50.584137",
    "Qassar Nun": "25.788611,50.603055",
    "Shahrakkan": "26.075378,50.499329",
    "West Riffa": "26.122660,50.542027",
    "Zayed city": "26.167150,50.538144",
    "Abu Baham": "26.205306,50.542351",
    "Abu Saiba": "26.217222,50.504166",
    "Al Jil`ah": "25.981111,50.530833",
    "AlJuffair": "26.211111,50.601111",
    "Avenue 17": "26.210257,50.486639",
    "Bu Ashira": "26.210327,50.579573",
    "Bu Kawara": "26.130500,50.562300",
    "Busaiteen": "26.273223,50.609368",
    "Halat Nun": "25.775277,50.598333",
    "Jid Alhaj": "26.234300,50.501700",
    "Junaibiya": "26.190900,50.464500",
    "Karzakkan": "26.110639,50.474759",
    "Markooban": "26.163177,50.619086",
    "Nuwaidrat": "26.134720,50.597500",
    "Reef Mall": "26.093140,50.489010",
    "Salmaniya": "26.216227,50.572193",
    "Shakhoora": "26.209757,50.505797",
    "Shakhurah": "26.209757,50.505797",
    "Al Jasra": "26.161576,50.456661",
    "Al Qadam": "26.213167,50.520027",
    "Al Qalah": "26.235417,50.520027",
    "Bu Quwah": "26.198302,50.516146",
    "capital": "26.216666,50.583333",
    "Dimestan": "26.123783,50.469587",
    "Ghuraifa": "26.205490,50.602000",
    "Isa Town": "26.173611,50.547777",
    "Janabiya": "26.184725,50.467002",
    "Jid Hafs": "26.219863,50.532967",
    "Jubailat": "26.184344,50.550117",
    "Karbabad": "26.230535,50.527791",
    "Karranah": "26.231222,50.510971",
    "Karzakan": "26.110639,50.474759",
    "Ma'ameer": "26.136869,50.609550",
    "Malikiya": "26.098060,50.486670",
    "Muharraq": "26.250000,50.616666",
    "Salihyya": "26.215700,50.559000",
    "Salmabad": "26.183333,50.516666",
    "Samaheej": "26.282980,50.633480",
    "Bu Quwa": "26.198302,50.516146",
    "Budaiya": "26.216666,50.450000",
    "Burhama": "26.216727,50.553677",
    "Hujjair": "26.184976,50.552059",
    "Jabbari": "25.882777,50.644722",
    "Janosan": "26.225800,50.494800",
    "Jid Ali": "26.178871,50.562739",
    "Jidhafs": "26.219863,50.532967",
    "Juffair": "26.211000,50.601100",
    "Kawarah": "26.181695,50.554324",
    "Maameer": "26.135900,50.611300",
    "Mahazza": "26.169440,50.626110",
    "Malikya": "26.099179,50.485103",
    "Malkiya": "26.098060,50.486670",
    "Muhazza": "26.169440,50.626110",
    "Muqasha": "26.222200,50.517300",
    "Qurayya": "26.201177,50.464416",
    "Sakheer": "26.056600,50.535000",
    "Samahij": "26.282980,50.633480",
    "Sanabis": "26.226559,50.545910",
    "Sh Aziz": "26.204056,50.534593",
    "Adliya": "26.214488,50.584754",
    "Al Hul": "25.739166,50.558055",
    "Alnaim": "26.228368,50.566624",
    "Athari": "26.199000,50.550800",
    "Bandar": "26.148230,50.619467",
    "Barbar": "26.229444,50.480555",
    "Buhair": "26.145925,50.567919",
    "Church": "26.232150,50.582230",
    "Galali": "26.266666,50.650000",
    "Galaly": "26.266666,50.650000",
    "Hamala": "26.138673,50.477345",
    "Hassam": "26.202900,50.595100",
    "Hilla": "26.227800,50.519900",
    "Hujair": "26.185000,50.551400",
    "Jerdab": "26.168500,50.572100",
    "Jurdab": "26.168217,50.571803",
    "Karana": "26.231222,50.510971",
    "Khamis": "26.205833,50.549722",
    "Kuwara": "26.145800,50.497800",
    "Magaba": "26.211320,50.495449",
    "Mahooz": "26.207910,50.587344",
    "Manama": "26.216666,50.583333",
    "Maqsha": "26.222200,50.517300",
    "Musala": "26.206670,50.538680",
    "Sakhir": "26.056600,50.535000",
    "Toobli": "26.188888,50.550000",
    "Wadyan": "26.157793,50.615847",
    "Zallaq": "26.050000,50.483333",
    "A'ali": "26.151944,50.525555",
    "Askar": "26.056936,50.616330",
    "Awali": "26.084444,50.550555",
    "Bilad": "26.206944,50.557777",
    "Diraz": "26.216666,50.466666",
    "Duraz": "26.216666,50.466666",
    "Geant": "26.229370,50.537320",
    "Hajar": "26.215577,50.512265",
    "Hawar": "25.644455,50.757254",
    "Hoora": "26.233700,50.593200",
    "Howra": "26.233700,50.593200",
    "Jasra": "26.163800,50.452000",
    "Markh": "26.208400,50.473300",
    "Qadam": "26.213167,50.520027",
    "Riffa": "26.130000,50.555000",
    "Sadad": "26.087715,50.495449",
    "Sanad": "26.150000,50.583333",
    "Sehla": "26.204800,50.526500",
    "Sihla": "26.204800,50.526500",
    "Sitra": "26.153400,50.618300",
    "Tubli": "26.188888,50.550000",
    "Aali": "26.151944,50.525555",
    "Arad": "26.251972,50.635287",
    "Buri": "26.155310,50.498036",
    "Daih": "26.225653,50.535556",
    "Dair": "26.286528,50.623622",
    "Fort": "26.235417,50.520027",
    "Hidd": "26.212633,50.674187",
    "Liya": "26.260555,50.516388",
    "Naim": "26.227700,50.568400",
    "Saar": "26.196111,50.486111",
    "Seef": "26.232220,50.536810",
    "Zinj": "26.210211,50.564034",
    "BIC": "26.030325,50.511214",
    "Ekr": "26.143060,50.610280",
    "Jaw": "25.998610,50.616670",
    "UOB": "26.049886,50.508384"
}