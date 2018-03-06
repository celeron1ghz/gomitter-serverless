import React from 'react';
import { Badge, Modal, Button, ButtonToolbar, DropdownButton, MenuItem, ListGroup, ListGroupItem, FormControl, Glyphicon, Panel, Well } from 'react-bootstrap';
import FontAwesome from 'react-fontawesome';

import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import '../node_modules/bootstrap/dist/css/bootstrap-theme.min.css';
import '../node_modules/font-awesome/css/font-awesome.min.css';

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      selectedSearch: null,
      tweets: [],
      next: null,
      showModal: false,
      input: "",
      me: null
    };
    this.AUTH_ENDPOINT_URL = "https://auth.familiar-life.info";
    this.GOMI_ENDPOINT_URL = "https://zwnmd5ldw2.execute-api.ap-northeast-1.amazonaws.com/dev/";

    this.tweet        = this.tweet.bind(this);
    this.openModal    = this.openModal.bind(this);
    this.closeModal   = this.closeModal.bind(this);
    this.inputUpdate  = this.inputUpdate.bind(this);
    this.login        = this.login.bind(this);
    this.logout       = this.logout.bind(this);
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

  apiCall(param) {
    return window.fetch(this.GOMI_ENDPOINT_URL, { method: 'POST', body: JSON.stringify(param) })
      .then(data => data.json())
      .then(data => {
        if (data.error) {
          console.log("API_ERROR", data);
          alert(`リクエストでエラーが発生しました。しばらく経って再度エラーになってもゴミなのであきらめてください。(${data.error})`);
        } else {
          return data;
        }
      })
      .catch(err => {
        console.log("SERVER_ERROR", err);
        alert(`サーバでエラーが発生しました。ゴミなのであきらめてください。(${err.message})`);
      });
  }

  componentDidMount() {
    this.getUserData().then(this.getSearchResult.bind(this, "global_hist", null));
  }

  login() {
    const getJwtToken = event => {
      localStorage.setItem("token", event.data);
      this.getUserData();
    };

    window.open(this.AUTH_ENDPOINT_URL + "/auth");
    window.addEventListener('message', getJwtToken, false);
  }

  logout() {
    if (window.confirm('ログアウトしますか？')) {
      localStorage.clear();
      this.setState({ me: null, favoriteIdx: {} });
    } else {
      alert("じゃあクリックするなよ（ﾌﾟﾝｽｺ");
    }
  }

  getUserData() {
    const token = localStorage.getItem("token");

    if (!token) return Promise.reject("No access_token. Please login!!");

    return window.fetch(this.AUTH_ENDPOINT_URL + '/me', { headers: new Headers({ 'Authorization': "Bearer " + token }) })
      .then(data => data.json())
      .then(data => {
        if (data.error) {
          console.log("API_ERROR", data);
          alert(`リクエストでエラーが発生しました。しばらく経って再度エラーになってもゴミなのであきらめてください。(${data.error})`);
        } else {
          this.setState({ me: data });
          return data;
        }
      })
  }

  getSearchResult(type, next){
    const { selectedSearch, tweets } = this.state;

    let param;
    if (type === "global_hist") param = { command: "list" };
    if (type === "my_hist")     param = { command: "list", member_id: "celeron1ghz" };
    if (type === "global_rank") param = { command: "rank" };
    if (type === "my_rank")     param = { command: "rank", member_id: "celeron1ghz" };

    param.next = next;

    console.log("SEARCH_PARAM", param);

    return this.apiCall(param).then(data => {
      if (!data) return;

      if (type === selectedSearch) {
        tweets.push(...data.tweets);
        console.log("APPEND");
        this.setState({ selectedSearch: type, tweets: tweets, next: data.next });
      } else {
        console.log("PUT");
        this.setState({ selectedSearch: type, tweets: data.tweets, next: data.next });
      }
    });
  }

  tweet(tweet) {
    if (window.confirm(tweet.tweet)) {
      console.log("TWEET");
      this.apiCall({ command: 'tweet', member_id: "celeron1ghz", tweet: tweet.tweet }).then(data => {
        alert('OK');
        this.closeModal();
      });
    } else {
      alert("じゃあクリックするなよ（ﾌﾟﾝｽｺ");
    }
  }

  render() {
    const { tweets, next, selectedSearch, showModal, input, me } = this.state;

    if (!me) {
      return <div className="container-fiuld text-center">
        <h2>Gomitter</h2>
        <h2>└(┐┘)┌ </h2>
        <br/>
        <div className="text-muted">Make your timeline garble.</div>
        <br/>
        <Button bsStyle="primary" onClick={this.login}><FontAwesome name="twitter"/> Login via Twitter</Button>
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
                bsStyle="success"
                bsSize="xsmall"
                id="dropdown-size-extra-small"
                title={<span><FontAwesome name="twitter"/> {me.screen_name}</span>}>
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
            <option value="global_rank">みんながよく使ったゴミ</option>
            <option value="my_hist">自分が使ったゴミ</option>
            <option value="my_rank">自分がよく使ったゴミ</option>
          </FormControl>
        </Panel.Body>
      </Panel>

      <Panel bsStyle="default">
        <Panel.Heading><Glyphicon glyph="trash"/> みんなが使ったゴミ</Panel.Heading>
        <ListGroup>
          {
            tweets.map(t =>
              <ListGroupItem key={t.id} style={{ whiteSpace: "pre" }} onClick={this.tweet.bind(this,t)}>
                {t.tweet}
                {t.count && <Badge>{t.count}</Badge>}
                <div className="text-muted">
                  {
                    t.member_id &&
                      <span><Glyphicon glyph="user"/> {t.member_id}&nbsp;&nbsp;</span>
                  }
                  {
                    t.created_at &&
                     <span><Glyphicon glyph="time"/> {new Date(t.created_at * 1000).toISOString()}</span>
                  }
                </div>
              </ListGroupItem>
            )
          }
          {
            next &&
              <ListGroupItem onClick={this.getSearchResult.bind(this, selectedSearch, next)}>
                Load Next
                <Glyphicon glyph="triangle-right"/><Glyphicon glyph="triangle-right"/>
              </ListGroupItem>
          }
          {
            !next &&
              <ListGroupItem className="text-center">
                <Glyphicon glyph="trash"/> 最後だよ <Glyphicon glyph="trash"/>
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