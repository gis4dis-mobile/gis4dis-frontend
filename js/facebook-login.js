//Facebook login
window.fbAsyncInit = function() {
    FB.init({
        appId      : '2031928567034931',
        cookie     : true,
        xfbml      : true,
        version    : 'v2.12'
    });

    FB.AppEvents.logPageView();

};

(function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

function checkLoginState() {
    FB.getLoginStatus(function (response) {
        console.log(response);
        statusChangeCallback(response);
    });
}
