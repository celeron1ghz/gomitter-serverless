import React from 'react';
import { Image, Badge, Modal, Button, ButtonToolbar, DropdownButton, MenuItem, ListGroup, ListGroupItem, FormControl, Glyphicon, Panel, Well } from 'react-bootstrap';
import FontAwesome from 'react-fontawesome';
import relativeDate from 'relative-date';
import { detect } from 'detect-browser';
import { Analytics } from 'aws-amplify';

import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import '../node_modules/bootstrap/dist/css/bootstrap-theme.min.css';
import '../node_modules/font-awesome/css/font-awesome.min.css';

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      oldBrowser: false,
      selectedSearch: null,
      selectedSearchLabel: null,
      tweets: [],
      count: null,
      next: null,
      showModal: false,
      input: "",
      me: null
    };
    this.GOMI_ENDPOINT_URL = "https://gomi-api.camelon.info";
    this.Label = {
      global_hist: "みんなが使ったゴミ",
      global_rank: "みんながよく使うゴミ",
      my_hist: "自分が使ったゴミ",
      my_rank: "自分がよく使うゴミ",
    };

    this.tweet        = this.tweet.bind(this);
    this.openModal    = this.openModal.bind(this);
    this.closeModal   = this.closeModal.bind(this);
    this.inputUpdate  = this.inputUpdate.bind(this);
    this.login        = this.login.bind(this);
    this.logout       = this.logout.bind(this);
    this.reload       = this.reload.bind(this);
    this.pinpoint     = this.pinpoint.bind(this);
  }

  onChange(e){
    this.getSearchResult(e.target.value);
  }

  inputUpdate(e) {
    this.setState({ input: e.target.value });
  }

  openModal() {
    this.setState({ showModal: true });
  }

  closeModal() {
    this.setState({ showModal: false });
  }

  pinpoint(type,args) {
    const { me } = this.state;

    if (!args) {
      args = {};
    }

    if (!args.user) {
      args.user = me ? me.screen_name : null;
    }

    Analytics.record({ name: type, attributes: args });
  }

  apiCall(param) {
    const token = window.localStorage.getItem("token");

    if (!token) {
      alert("ログインしてください。");
      this.setState({ me: "" });
      return;
    }

    return window.fetch(this.GOMI_ENDPOINT_URL, {
      method: 'POST',
      body: JSON.stringify(param),
      headers: new window.Headers({ 'Authorization': "Bearer " + token }),
    }).then(data => data.json())
      .then(data => {
        if (data.error === "EXPIRED") {
          console.log("Error on access to API:", data);
          this.pinpoint('expired');
          alert("セッションが切れました。再度ログインしてください。");
          this.setState({ me: "" });
          return;
        }

        if (data.error) {
          console.log("API_ERROR", data);
          this.pinpoint('error_api');
          alert(`リクエストでエラーが発生しました。再読み込みして解決しない場合はあきらめてください。(gomi:${data.error})`);
        } else {
          return data;
        }
      })
      .catch(err => {
        console.log("SERVER_ERROR", err);
        this.pinpoint('error_server');
        alert(`サーバでエラーが発生しました。再読み込みして解決しない場合はあきらめてください。(gomi:${err.message})`);
      });
  }

  componentDidMount() {
    this.pinpoint('load');
    Promise.resolve()
      .then(data => {
        try {
          if (!window.localStorage) {
            return Promise.reject("LOCAL_STORAGE_NOT_EXIST");
          }
        } catch(err) {
          return Promise.reject("LOCAL_STORAGE_NOT_EXIST");
        }

        const browser = detect();
        const ver = parseInt(browser.version, 10);
        console.log(browser);

        if (browser.name === "ie" && ver <= 11) {
          this.pinpoint('error_browser', { name: browser.name, ver: ver });
          return Promise.reject("OLD_BROWSER");
        }
      })
      .catch(err => {
        console.log("Error on detect:", err);

        if (typeof err === "string") {
          this.setState({ oldBrowser: detect() });
        }

        return Promise.reject(err);
      })
      .then(this.getUserData.bind(this))
      .then(this.getSearchResult.bind(this, "global_hist", null))
      .catch(err => {
        console.log("Error on init:", err);
        this.setState({ me: "" });
      });
  }

  login() {
    const getJwtToken = event => {
      window.localStorage.setItem("token", event.data);

      this.getUserData()
        .then(this.getSearchResult.bind(this, "global_hist", null))
        .catch(err => {
          alert(err);
          this.setState({ me: "" });
        });
    };

    this.pinpoint('login');
    window.open(this.GOMI_ENDPOINT_URL + "/auth/start");
    window.addEventListener('message', getJwtToken, false);
  }

  logout() {
    const { me } = this.state;
    this.pinpoint('logout');

    if (window.confirm('ログアウトしますか？')) {
      window.localStorage.clear();
      this.setState({ me: "" });
    } else {
      alert("じゃあクリックするなよ（ﾌﾟﾝｽｺ");
    }
  }

  getUserData() {
    const token = window.localStorage.getItem("token");
    if (!token) return Promise.reject("ログインしてください。(local)");

    this.pinpoint('api', { command: 'me' });
    return window.fetch(this.GOMI_ENDPOINT_URL + '/auth/me', { headers: new window.Headers({ 'Authorization': "Bearer " + token }) })
      .then(data => data.json())
      .then(data => {
        if (data.error) {
          return Promise.reject(`ログインしてください。(auth:${data.error})`);
        }

        this.setState({ me: data });
        return data;
      });
  }

  getSearchResult(type, next){
    const { me, selectedSearch, tweets } = this.state;
    this.pinpoint('api', { command: type });

    let param;
    if (type === "global_hist") param = { command: "list" };
    if (type === "my_hist")     param = { command: "list", me: 1 };
    if (type === "global_rank") param = { command: "rank" };
    if (type === "my_rank")     param = { command: "rank", me: 1 };

    param.next = next;

    console.log("SEARCH_PARAM", param);

    return this.apiCall(param).then(data => {
      if (!data) return;

      if (type === selectedSearch && next) {
        tweets.push(...data.tweets);
        console.log("APPEND_TWEET", tweets.length);
        this.setState({ selectedSearch: type, selectedSearchLabel: this.Label[type], tweets: tweets, next: data.next, count: data.count });
      } else {
        console.log("PUT_TWEET", data.tweets.length);
        this.setState({ selectedSearch: type, selectedSearchLabel: this.Label[type], tweets: data.tweets, next: data.next, count: data.count });
      }
    });
  }

  reload() {
    const { selectedSearch } = this.state;
    this.pinpoint('api', { command: 'reload' });
    this.getSearchResult(selectedSearch, null);
  }

  tweet(tweet) {
    if (window.confirm(tweet.tweet)) {
      this.pinpoint('api', { command: 'tweet' });
      this.apiCall({ command: 'tweet', tweet: tweet.tweet }).then(data => {
        alert('OK');
        this.closeModal();
      });
    } else {
      this.pinpoint('api', { command: 'tweet_cancel' });
      alert("じゃあクリックするなよ（ﾌﾟﾝｽｺ");
    }
  }

  render() {
    const { oldBrowser, tweets, next, count, selectedSearch, selectedSearchLabel, showModal, input, me } = this.state;

    if (oldBrowser) {
      return <div className="container-fiuld text-center">
        <h2>Gomitter</h2>
        <h2>└(┐┘)┌ </h2>
        <br/>
        <div>
          クソブラウザなのでGomitterが使えません。<br/>
          もっと新しいブラウザ使えよ、お前はゴミか？？？？？<br/>
          ({oldBrowser.name} {oldBrowser.version})
        </div>
      </div>;

    }

    if (me === "") {
      return <div className="container-fiuld text-center">
        <h2>Gomitter</h2>
        <h2>└(┐┘)┌ </h2>
        <br/>
        <div className="text-muted">Make your timeline garble.</div>
        <br/>
        <Button bsStyle="primary" onClick={this.login}><FontAwesome name="twitter"/> Login via Twitter</Button>
      </div>;
    }

    if (!me) {
      return <div className="text-center">
        <h1><FontAwesome name="spinner" spin pulse={true} /> Loading...</h1>
      </div>;
    }

    return <div className="container">
      <br/>
      <Well bsSize="small" className="clearfix">
        <span onClick={() => alert("バーーーカwwwwwwwwwwwwwwwwwwww")}>
          <Glyphicon glyph="trash"/>
          Gomitter
          <Glyphicon glyph="trash"/>
        </span>
        <div className="pull-right">
          {
            <ButtonToolbar>
              <DropdownButton pullRight
                bsStyle="primary"
                bsSize="xsmall"
                id="dropdown-size-extra-small"
                title={<span><FontAwesome name="twitter"/> {me.screen_name}</span>}>
                  <MenuItem eventKey="0" onClick={() => alert("はずれ")}>
                    {me.display_name + ' '}
                    <Image circle src={me.profile_image_url} style={{width: "32px", height: "32px", border: "1px solid gray" }}/>
                  </MenuItem>
                  <MenuItem divider />
                  <MenuItem eventKey="1" onClick={this.openModal}><Glyphicon glyph="plus"/> 新規ツイート</MenuItem>
                  <MenuItem divider />
                  <MenuItem eventKey="2" onClick={this.logout}><Glyphicon glyph="log-out"/> ログアウト</MenuItem>
              </DropdownButton>
            </ButtonToolbar>
          }
        </div>
      </Well>

      <Panel bsStyle="info">
        <Panel.Heading><Glyphicon glyph="search"/> 検索するゴミの条件</Panel.Heading>
        <Panel.Body>
          <FormControl componentClass="select" placeholder="select" onChange={this.onChange.bind(this)}>
            <option value="global_hist">みんなが使ったゴミ</option>
            <option value="global_rank">みんながよく使うゴミ</option>
            <option value="my_hist">自分が使ったゴミ</option>
            <option value="my_rank">自分がよく使うゴミ</option>
          </FormControl>
        </Panel.Body>
      </Panel>

      <Panel bsStyle="default">
        <Panel.Heading>
          <Glyphicon glyph="trash"/>
          {' '}
          {selectedSearchLabel || '読み込み中...'}
          {' '}
          <Badge>{count}</Badge>
          <div className="pull-right" onClick={this.reload}><Glyphicon glyph="refresh"/></div>
        </Panel.Heading>
        <ListGroup>
          {
            tweets.map(t => {
              return <ListGroupItem
                key={t.id}
                style={{ whiteSpace: t.tweet.split("\n").length === 1 ? "preWrap" : "pre" }}
                onClick={this.tweet.bind(this,t)}>
                  {t.count && <Badge>{t.count}</Badge>}
                  {t.tweet}
                  <div className="text-muted">
                    {
                      t.member_id &&
                        <span><Glyphicon glyph="user"/> {t.member_id}&nbsp;&nbsp;</span>
                    }
                    {
                      t.created_at &&
                        <span>
                          <Glyphicon glyph="time"/> {new Date(t.created_at * 1000).toLocaleString()} ({relativeDate(t.created_at * 1000)})
                        </span>
                    }
                  </div>
              </ListGroupItem>;
            })
          }
          {
            next &&
              <ListGroupItem className="text-center text-muted">
                <span onClick={this.getSearchResult.bind(this, selectedSearch, next)}>
                  <Glyphicon glyph="triangle-right"/><Glyphicon glyph="triangle-right"/>
                  Load Next
                  <Glyphicon glyph="triangle-right"/><Glyphicon glyph="triangle-right"/>
                </span>
              </ListGroupItem>
          }
          {
            !next &&
              <ListGroupItem className="text-center text-muted">
                <span onClick={() => alert("最後だって言ってるだろ！！！！（ﾌﾞﾁｷﾞﾚ")}>
                  <Glyphicon glyph="trash"/> 最後だよ <Glyphicon glyph="trash"/>
                </span>
              </ListGroupItem>
          }
        </ListGroup>
      </Panel>

      <Modal show={showModal} onHide={this.closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Glyphicon glyph="plus"/> 新規にゴミをつくる ({input.length}/140)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormControl componentClass="textarea" placeholder="(ゴミを入力)" rows={10} onChange={this.inputUpdate} value={input}/>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.closeModal}><Glyphicon glyph="remove"/> 閉じる</Button>
          <Button bsStyle="primary" onClick={this.tweet.bind(this,{ tweet: input })}><FontAwesome name="twitter"/> Tweet</Button>
        </Modal.Footer>
      </Modal>
    </div>;
  }
}

export default App;
