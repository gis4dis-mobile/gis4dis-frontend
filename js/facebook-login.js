//Facebook login
window.fbAsyncInit = function() {
    FB.init({
        appId      : '2031928567034931',
        cookie     : true,
        xfbml      : true,
        version    : 'v2.12'
    });

    //FB.AppEvents.logPageView();

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
        //console.log(response);
        if (response.status === 'connected') {
            //console.log(response.authResponse.accessToken);

            FB.api('/me', { locale: 'en_US', fields: 'name, email' },
                function(userInfo) {
                    let email = userInfo.email;
                    facebookLogin(response.authResponse.accessToken, email);
                }
            );

        } else if (response.status === 'not_authorized') {
            Materialize.toast('Login failed.', 4000);
        } else {
            Materialize.toast('Login failed.', 4000);
        }
    });
}